// read_drawio: free edge ends, zero coordinates and label offsets.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readDrawioTool } from "../src/tools/read-drawio.js";

const XML = `<mxfile><diagram id="d" name="Page-1"><mxGraphModel><root>
  <mxCell id="0" />
  <mxCell id="1" parent="0" />
  <mxCell id="box" value="Box" vertex="1" parent="1">
    <mxGeometry y="40" width="50" height="20" as="geometry" />
  </mxCell>
  <mxCell id="free" edge="1" parent="1">
    <mxGeometry relative="1" as="geometry">
      <mxPoint x="240" y="460" as="sourcePoint" />
      <mxPoint x="450" as="targetPoint" />
    </mxGeometry>
  </mxCell>
  <mxCell id="half" edge="1" parent="1" target="box">
    <mxGeometry relative="1" as="geometry">
      <Array as="points"><mxPoint x="300" y="50" /></Array>
      <mxPoint x="10" y="20" as="sourcePoint" />
      <mxPoint x="999" y="999" as="targetPoint" />
    </mxGeometry>
  </mxCell>
  <mxCell id="lbl" value="L" vertex="1" connectable="0" parent="half">
    <mxGeometry x="-0.1" relative="1" as="geometry">
      <mxPoint y="-5" as="offset" />
    </mxGeometry>
  </mxCell>
</root></mxGraphModel></diagram></mxfile>`;

function readFixture(args = {}) {
  const dir = mkdtempSync(join(tmpdir(), "read-drawio-"));
  try {
    const file = join(dir, "fixture.drawio");
    writeFileSync(file, XML, "utf-8");
    return readDrawioTool.read({ file_path: file, ...args });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("free edge ends are reported as source_point / target_point", () => {
  const free = readFixture().edges.find((e) => e.id === "free");
  assert.deepEqual(free.source_point, { x: 240, y: 460 });
  assert.deepEqual(free.target_point, { x: 450, y: 0 });
});

test("attached ends drop their stale point", () => {
  const half = readFixture().edges.find((e) => e.id === "half");
  assert.equal(half.target, "box");
  assert.equal(half.target_point, undefined);
  assert.deepEqual(half.source_point, { x: 10, y: 20 });
  assert.deepEqual(half.points, [{ x: 300, y: 50 }]);
});

test("omitted x / y default to 0 and label offsets are kept", () => {
  const shapes = readFixture().shapes;
  const box = shapes.find((s) => s.id === "box");
  assert.equal(box.geometry.x, 0);
  assert.equal(box.geometry.y, 40);
  const lbl = shapes.find((s) => s.id === "lbl");
  assert.equal(lbl.geometry.y, 0);
  assert.deepEqual(lbl.geometry.offset, { x: 0, y: -5 });
});

test("include_geometry: false strips edge end points", () => {
  const free = readFixture({ include_geometry: false }).edges.find((e) => e.id === "free");
  assert.equal(free.source_point, undefined);
  assert.equal(free.target_point, undefined);
});
