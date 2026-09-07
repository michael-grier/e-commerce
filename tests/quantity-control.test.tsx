import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { QuantityControl } from "@/components/shop/quantity-control";

afterEach(cleanup);

/** Uses real controlled state so repeated invalid entries exercise DOM correction too. */
function EditableQuantity() {
  const [value, setValue] = useState(2);
  const [limited, setLimited] = useState(false);
  return (
    <>
      <QuantityControl
        editable
        label="Deck"
        max={9}
        onChange={setValue}
        onLimit={() => setLimited(true)}
        value={value}
      />
      {limited ? <p role="status">Maximum available: 9</p> : null}
    </>
  );
}

test("typed quantities clamp immediately, including repeated oversized entries at the limit", () => {
  render(<EditableQuantity />);
  const input = screen.getByRole("spinbutton") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "20" } });
  expect(input.value).toBe("9");
  expect(screen.getByRole("status").textContent).toBe("Maximum available: 9");
  expect((screen.getByRole("button", { name: /Increase/ }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  fireEvent.change(input, { target: { value: "99" } });
  expect(input.value).toBe("9");
  fireEvent.change(input, { target: { value: "3.8" } });
  expect(input.value).toBe("3");
  fireEvent.change(input, { target: { value: "-2" } });
  expect(input.value).toBe("1");
});

test("an empty edit can be replaced and restores the stored quantity on blur", () => {
  render(<EditableQuantity />);
  const input = screen.getByRole("spinbutton") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
  fireEvent.blur(input);
  expect(input.value).toBe("2");
  fireEvent.change(input, { target: { value: "" } });
  fireEvent.change(input, { target: { value: "7" } });
  expect(input.value).toBe("7");
});
