import assert from "node:assert/strict";
import test from "node:test";
import { startResourceLoad } from "../src/lib/api/use-api-resource.ts";

test("reports a synchronous loader error without letting it escape", () => {
  const failure = new Error("loader failed");
  let received;
  assert.doesNotThrow(() => startResourceLoad(
    () => { throw failure; },
    new AbortController().signal,
    () => assert.fail("unexpected success"),
    (error) => { received = error; },
  ));
  assert.equal(received, failure);
});

test("delivers a resolved value and an asynchronous rejection", async () => {
  const values = [];
  const errors = [];
  startResourceLoad(() => Promise.resolve("loaded"), new AbortController().signal, (value) => values.push(value), (error) => errors.push(error));
  const failure = new Error("request failed");
  startResourceLoad(() => Promise.reject(failure), new AbortController().signal, (value) => values.push(value), (error) => errors.push(error));
  await Promise.resolve();
  assert.deepEqual(values, ["loaded"]);
  assert.deepEqual(errors, [failure]);
});

test("ignores both success and failure after cancellation", async () => {
  const controller = new AbortController();
  const received = [];
  let resolve;
  let reject;
  const success = new Promise((done) => { resolve = done; });
  const failure = new Promise((_, fail) => { reject = fail; });
  startResourceLoad(() => success, controller.signal, (value) => received.push(value), (error) => received.push(error));
  startResourceLoad(() => failure, controller.signal, (value) => received.push(value), (error) => received.push(error));
  controller.abort();
  resolve("late value");
  reject(new Error("late error"));
  await Promise.resolve();
  assert.deepEqual(received, []);

  let called = false;
  startResourceLoad(() => { called = true; return Promise.resolve("ignored"); }, controller.signal, () => {}, () => {});
  assert.equal(called, false);
});
