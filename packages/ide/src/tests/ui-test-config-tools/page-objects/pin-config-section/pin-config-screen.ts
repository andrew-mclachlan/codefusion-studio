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

import { By, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

export const searchField: By = By.css(`#control-input`);
export const assignedPinsList: By = By.css("#peripheral-navigation > section");
export const pinDetailsContainer: By = By.css("#details-container");
export const configButton: By = By.css("[class^='_configButtonContainer_']");
export const pinTooltipTitle: By = By.css(
  "#pin-details-title > div:first-of-type > h3:first-of-type",
);
export const focusedPinBackdrop: By = By.css("#focused-pin-backdrop");

export async function pinDropdown(pinName: string): Promise<By> {
  return By.css(`[data-test="accordion:${pinName}"]`);
}

export async function pinToggle(
  peripheralName: string,
  signalName: string,
): Promise<By> {
  return By.css(`[data-test="${peripheralName}-${signalName}-span"]`);
}

export async function pinConfigButton(
  peripheralName: string,
  signalName: string,
): Promise<By> {
  return By.css(
    `section[data-test="${peripheralName}-${signalName}"] > div[class*='configButtonContainer']`,
  );
}

export async function pinConfigContainer(
  peripheralName: string,
  signalName: string,
): Promise<By> {
  return By.css(`section[data-test="${peripheralName}-${signalName}"]`);
}

export async function signalToggleWithIndex(index: number): Promise<By> {
  return By.css(
    `#pin-details-signals-container > div:nth-child(${index}) > section > label`,
  );
}

export async function signalControlDropdown(signalName: string): Promise<By> {
  return By.css(`#${signalName}-control-dropdown`);
}

export async function signalConflictIcon(signalName: string): Promise<By> {
  return By.css(`div#signal-${signalName}-conflict`);
}

export async function mainPanelPinOnLineAndColumn(
  lineIndex: number,
  columnIndex: number,
): Promise<By> {
  return By.css(
    `#pin-rows-container > div:nth-child(${lineIndex}) > div:nth-child(${columnIndex}) > div:nth-child(1)`,
  );
}

/**
 * Assigns a peripheral pin to a signal in the UI and verifies the assignment by checking the 'data-checked' attribute.
 *
 * @param view - The WebView instance representing the current UI context.
 * @param pinconfig - An object containing:
 *   @property peripheral - The name of the peripheral to assign (e.g., "OWM").
 *   @property signal - The name of the signal to assign the peripheral to (e.g., "OWM-IO").
 * @returns A Promise that resolves when the assignment and verification are complete.
 */
export async function assignPinToSignal(
  view: WebView,
  pinconfig: {
    peripheral: string;
    signal: string;
  },
): Promise<void> {
  const { peripheral, signal } = pinconfig;
  await UIUtils.clickElement(view, `accordion:${peripheral}`);
  const pinValue = await (
    await UIUtils.clickElement(view, `${signal}-span`)
  ).getAttribute("data-checked");
  expect(pinValue).to.equal("true");
}
