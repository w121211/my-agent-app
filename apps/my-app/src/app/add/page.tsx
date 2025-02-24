"use client";

import  { useState } from 'react';
import { add } from '@repo/events/add';

const AddTest = () => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const handleCalculate = () => {
    setResult(add(num1, num2));
  };

  return (
    <div className="grid min-h-screen p-8 items-center justify-items-center">
      <main className="flex flex-col gap-4 items-center">
        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={num1}
            onChange={(e) => setNum1(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20"
          />
          <span>+</span>
          <input
            type="number"
            value={num2}
            onChange={(e) => setNum2(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20"
          />
          <button
            onClick={handleCalculate}
            className="rounded-full bg-foreground text-background px-4 h-10 hover:bg-[#383838]"
          >
            Calculate
          </button>
        </div>
        {result !== null && (
          <div className="text-center mt-4">
            Result: {result}
          </div>
        )}
      </main>
    </div>
  );
};

export default function Page() {
  return <AddTest />;
}
