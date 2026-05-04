import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("axios", () => ({
  get: jest.fn(() => Promise.resolve({ data: [] })),
  delete: jest.fn(() => Promise.resolve({ data: { message: "All allocations cleared" } })),
}));

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test("renders navbar links", async () => {
  render(<App />);
  expect(await screen.findByText(/home/i)).toBeInTheDocument();
  expect(screen.getByText(/allocation/i)).toBeInTheDocument();
  expect(screen.getByText(/about/i)).toBeInTheDocument();
});
