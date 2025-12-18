/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// HexAddress for comparison
export function parseAddr(s?: string): number {
  const t = (s ?? "").trim();
  if (!t) return NaN;
  const cleaned = t.replace(/^0x/i, "");
  if (/^[0-9a-f]+$/i.test(cleaned)) return parseInt(cleaned, 16);
  return parseInt(t.replace(/[_,\s,]/g, ""), 10);
}

// ByteSize for comparison
export function parseSizeBytes(s?: string): number {
  const n = Number((s ?? "").replace(/[_,\s,]/g, ""));
  return Number.isFinite(n) ? n * 1024 * 1024 : NaN;
}
