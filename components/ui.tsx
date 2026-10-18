"use client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type AriaAttributes,
} from "react";
import { X, Flag, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
}) {
  return <button className={cn("button", variant, className)} {...props} />;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  soft = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  soft?: boolean;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={cn("modal-overlay", soft && "soft")} />
        <Dialog.Content className={cn("modal", wide && "wide")}>
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
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
