import { server } from "./mocks/node.js";

beforeAll(() => {
  // Enable API mocking before all the tests.
  server.listen();
});

afterEach(() => {
  // Reset the request handlers between each test.
  // This way the handlers we add on a per-test basis
  // do not leak to other, irrelevant tests.
  server.resetHandlers();
});

afterAll(() => {
  // Finally, disable API mocking after the tests are done.
  server.close();
});

it("receives a mocked response to a REST API request", async () => {
  const response = await fetch("https://api.example.com/user");

  expect(response.status).toBe(200);
  expect(response.statusText).toBe("OK");
  expect(await response.json()).toEqual({
    firstName: "John",
    lastName: "Maverick",
  });
});

it("receives a mocked response to a REST API requets to a relative URL", async () => {
  const response = await fetch("/product");

  expect(response.status).toBe(200);
  expect(response.statusText).toBe("OK");
  expect(await response.json()).toEqual({
    name: "Awesome Product",
  });
});

it("receives a mocked response to a GraphQL API request", async () => {
  const response = await fetch("https://api.example.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query ListMovies {
          movies {
            title
          }
        }
      `,
    }),
  });

  expect(response.status).toBe(200);
  expect(response.statusText).toBe("OK");
  expect(await response.json()).toEqual({
    data: {
      movies: [
        {
          title: "The Lord of The Rings",
        },
        {
          title: "The Matrix",
        },
        {
          title: "Star Wars: The Empire Strikes Back",
        },
      ],
    },
  });
});
