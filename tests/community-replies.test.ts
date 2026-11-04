import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../components/community.tsx", import.meta.url),
  "utf8",
);

test("replies start folded and open per post with an arrow button", () => {
  // Nothing is open until a post's toggle is pressed.
  assert.match(
    source,
    /\[openReplies, setOpenReplies\] = useState<Record<string, boolean>>\(\{\}\)/,
  );
  assert.match(
    source,
    /className="post-replies"\s*id=\{`replies-\$\{p\.id\}`\}\s*hidden=\{!openReplies\[p\.id\]\}/,
  );
  // The toggle is a real button tied to the replies it controls.
  assert.match(
    source,
    /className="replies-toggle"\s*aria-expanded=\{!!openReplies\[p\.id\]\}\s*aria-controls=\{`replies-\$\{p\.id\}`\}/,
  );
  assert.match(source, /"Ocultar respuestas"/);
  assert.match(source, /`Ver \$\{p\.comments\.length\}/);
  // Both the replies and the reply form live inside the folded block.
  const block = source.slice(source.indexOf('className="post-replies"'));
  assert.ok(block.indexOf("p.comments.map") < block.indexOf("</div>"));
  assert.ok(
    block.indexOf('className="comment-form"') < block.indexOf("</form>"),
  );
});

test("the arrow turns when open and respects Reduce Motion", () => {
  const css = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /\.post-actions \[aria-expanded="true"\] \.replies-chevron \{\s*transform: rotate\(180deg\);/,
  );
  assert.match(
    css,
    /prefers-reduced-motion: reduce\) \{\s*\.post-actions \.replies-chevron \{\s*transition: none;/,
  );
});

test("folded replies still wrap long text", () => {
  const css = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /\.post-replies > \.comment \{\s*white-space: pre-wrap;\s*overflow-wrap: anywhere;/,
  );
});
