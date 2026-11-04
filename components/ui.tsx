"use client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type AriaAttributes,
} from "react";
import { createPortal } from "react-dom";
import { X, Flag, ArrowUpRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSheetDrag } from "@/lib/use-native-feel";
export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
}) {
  return <button className={cn("button", variant, className)} {...props} />;
}
/** A screen's main action. In the iOS app it moves to <body> so it can float
 * above the tab bar, out of reach of the screen's slide-in transform. */
export function ThumbAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () =>
      setHost(root.classList.contains("native-ios") ? document.body : null);
    sync();
    const Observer = window.MutationObserver;
    if (!Observer) return;
    const observer = new Observer(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const button = (
    <Button className={cn("native-thumb-action", className)} {...props} />
  );
  return host ? createPortal(button, host) : button;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  soft = false,
  style,
  shouldReturnFocus,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  soft?: boolean;
  /** CSS variables for the sheet, e.g. a photo tint. */
  style?: React.CSSProperties;
  /** Read when the sheet closes: false leaves focus where navigation put
   * it instead of returning it to the control that opened the sheet. */
  shouldReturnFocus?: () => boolean;
}) {
  const returnFocus = useRef(
    typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const titleRef = useRef<HTMLHeadingElement>(null);
  // State, not a ref: the portal content mounts after this component's effects.
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null);
  const nativeSheet =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("native-ios");
  useSheetDrag(nativeSheet, sheet, onClose);
  return (
    <Dialog.Root
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={cn("modal-overlay", soft && "soft")} />
        <Dialog.Content
          ref={setSheet}
          className={cn("modal", wide && "wide")}
          style={style}
          onOpenAutoFocus={(event) => {
            if (document.documentElement.classList.contains("native-ios")) {
              event.preventDefault();
              titleRef.current?.focus({ preventScroll: true });
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (shouldReturnFocus && !shouldReturnFocus()) return;
            // Another dialog may have replaced this one while its chunk loaded.
            if (
              Array.from(document.querySelectorAll('[role="dialog"]')).some(
                (dialog) =>
                  dialog !== event.target &&
                  dialog.getAttribute("data-state") !== "closed",
              )
            )
              return;
            const target = returnFocus.current;
            if (
              target?.isConnected &&
              target !== document.body &&
              !target.closest("[inert]") &&
              target.getClientRects().length
            )
              target.focus();
            else
              document
                .querySelector<HTMLElement>("#main-content, #fw-main")
                ?.focus({ preventScroll: true });
          }}
        >
          {nativeSheet && (
            <span className="native-sheet-handle" aria-hidden="true" />
          )}
          <div className="modal-heading">
            {typeof document !== "undefined" &&
              document.documentElement.classList.contains("native-ios") && (
                <button
                  type="button"
                  data-native-back
                  className="native-modal-back"
                  onClick={onClose}
                  aria-label="Volver"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
            <Dialog.Title ref={titleRef} tabIndex={-1}>
              {title}
            </Dialog.Title>
            <Dialog.Close aria-label="Cerrar" className="icon-btn">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Formulario y detalles de {title}.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  const generated = useId();
  type ControlProps = {
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: AriaAttributes["aria-invalid"];
  };
  const controls = Children.toArray(children).filter(
    (child) =>
      isValidElement(child) &&
      typeof child.type === "string" &&
      ["input", "select", "textarea"].includes(child.type),
  ) as ReactElement<ControlProps>[];
  const id = controls[0]?.props.id || generated;
  const hintId = hint ? `${generated}-hint` : undefined;
  const errorId = error ? `${generated}-error` : undefined;
  let controlIndex = 0;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child) => {
        if (
          !isValidElement(child) ||
          typeof child.type !== "string" ||
          !["input", "select", "textarea"].includes(child.type)
        )
          return child;
        const control = child as ReactElement<ControlProps>;
        const controlId =
          control.props.id ||
          (controlIndex === 0 ? id : `${generated}-${controlIndex}`);
        controlIndex += 1;
        return cloneElement(control, {
          id: controlId,
          "aria-describedby":
            [control.props["aria-describedby"], hintId, errorId]
              .filter(Boolean)
              .join(" ") || undefined,
          "aria-invalid": error ? true : control.props["aria-invalid"],
        });
      })}
      {hint && <small id={hintId}>{hint}</small>}
      {error && (
        <small id={errorId} className="error-text field-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon ?? <Flag size={28} />}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function InlineLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="inline-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
