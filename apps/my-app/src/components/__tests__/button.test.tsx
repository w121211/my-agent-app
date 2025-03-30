// components/__tests__/Button.test.tsx
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../button"; // 使用相对路径导入更简单

describe("Button 组件", () => {
  it("渲染正确的文本", () => {
    render(<Button label="点击我" />);
    const buttonElement = screen.getByText("点击我");
    expect(buttonElement).toBeInTheDocument();
  });

  it("点击时调用 onClick 处理函数", () => {
    const handleClick = jest.fn();
    render(<Button label="点击我" onClick={handleClick} />);

    const buttonElement = screen.getByText("点击我");
    fireEvent.click(buttonElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
