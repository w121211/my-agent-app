import { add } from "../src/add";

describe("add function", () => {
  test("should correctly add two positive numbers", () => {
    expect(add(1, 2)).toBe(3);
    expect(add(10, 20)).toBe(30);
  });

  test("should correctly handle zero", () => {
    expect(add(0, 5)).toBe(5);
    expect(add(5, 0)).toBe(5);
    expect(add(0, 0)).toBe(0);
  });

  test("should correctly add negative numbers", () => {
    expect(add(-1, -2)).toBe(-3);
    expect(add(-10, 5)).toBe(-5);
    expect(add(5, -10)).toBe(-5);
  });

  test("should handle decimal numbers", () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3);
    expect(add(1.5, 2.7)).toBeCloseTo(4.2);
  });
});
