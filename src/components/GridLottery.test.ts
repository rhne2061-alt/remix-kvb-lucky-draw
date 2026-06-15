import { describe, expect, it } from "vitest";

import { getPerimeterIndexForGridCell } from "./GridLottery";

describe("getPerimeterIndexForGridCell", () => {
  it("maps every perimeter grid cell to the correct clockwise index", () => {
    expect(getPerimeterIndexForGridCell(0)).toBe(0);
    expect(getPerimeterIndexForGridCell(1)).toBe(1);
    expect(getPerimeterIndexForGridCell(2)).toBe(2);
    expect(getPerimeterIndexForGridCell(5)).toBe(3);
    expect(getPerimeterIndexForGridCell(8)).toBe(4);
    expect(getPerimeterIndexForGridCell(7)).toBe(5);
    expect(getPerimeterIndexForGridCell(6)).toBe(6);
    expect(getPerimeterIndexForGridCell(3)).toBe(7);
  });
});
