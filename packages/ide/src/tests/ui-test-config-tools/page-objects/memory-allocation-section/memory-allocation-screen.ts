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
import {
  memoryTypeDropdown,
  memoryTypeSelector,
} from "./create-partition-sidebar";

export const partitionDetailsDropdowns: By = By.css(
  `[data-test="partition-details-chevron"]`,
);
export const cm4PartitionCardTitles: By = By.css(
  `[data-test="CM4-partition-card-title"] `,
);
export const createPartitionButton: By = By.css(
  "[data-test='create-partition-btn']",
);
export const deletePartitionButton: By = By.css(
  "[data-test='delete-partition-btn']",
);
export const memoryTypeFilterButton: By = By.css(
  "[data-test='memory-type-filter']",
);
export const memoryTypeFilterOptionRAM: By = By.css(
  "[data-test='multiselect-option-RAM']",
);

export async function partitionDetailsChevron(index: number): Promise<By> {
  return By.xpath(`(//div[@data-test='partition-details-chevron'])[${index}]`);
}

export async function getDeletePartitionButton(index: number): Promise<By> {
  return By.xpath(`(//*[@data-test='delete-partition-btn'])[${index}]`);
}

export async function getEditPartitionButton(index: number): Promise<By> {
  return By.xpath(`(//*[@data-Test='edit-partition-btn'])[${index}]`);
}

export async function getPartitionTitleEl(
  coreId: "CM4" | "RV",
  index: number,
): Promise<By> {
  return By.xpath(
    `(//div[@data-test='${coreId}-partition-card-title']/h3)[${index}]`,
  );
}

export async function getPartitionName(name: string): Promise<By> {
  return By.xpath(`//div[@class='_title_5et1w_51' and text()='${name}']`);
}

export async function getStartAddressForMemoryType(
  memoryType: "flash0" | "flash1" | "sysram0",
): Promise<By> {
  return By.xpath(
    `//div[@data-test="accordion:${memoryType}"]//span[text()="Start Address"]/following-sibling::span`,
  );
}

export async function getEndAddressForMemoryType(
  memoryType: "flash0" | "flash1" | "sysram0",
): Promise<By> {
  return By.xpath(
    `//div[@data-test="accordion:${memoryType}"]//span[text()="End Address"]/following-sibling::span`,
  );
}

export async function leftPartitionDropdown(
  partitionName: string,
): Promise<By> {
  return By.css(`[data-test="accordion:${partitionName}"]`);
}

/**
 * Creates a memory partition in the UI with the specified options and verifies its existence
 * @param view - The WebView instance representing the current UI context.
 * @param options - An object containing:
 *   @property memoryType - The type of memory (e.g., "Flash").
 *   @property partitionName - The name of the partition to create (e.g., "smoketest").
 *   @property coreName - The name of the core to assign the partition to (e.g., "arm_cortex").
 *   @property baseBlock - The base block to select (e.g., "flash1").
 *   @property sizeKB - The size of the partition in KB (e.g., "8").
 * @returns A Promise that resolves when the partition is created and verified.
 */
export async function createAndVerifyMemoryPartition(
  view: WebView,
  options: {
    memoryType: "Flash";
    partitionName: string;
    coreName: string;
    baseBlock: string;
    sizeKB: string;
  },
): Promise<void> {
  const { partitionName, coreName, baseBlock, sizeKB } = options;

  // ===Open partition creation dialog===
  await UIUtils.clickElement(view, createPartitionButton);

  // ===Select memory type===
  await UIUtils.selectOptionFromDropdown(
    view,
    memoryTypeDropdown,
    await memoryTypeSelector(options.memoryType),
  );

  // ===Enter partition name===
  await UIUtils.sendKeysToElements(
    view,
    By.css('[data-test="partition-name-control-input"]'),
    partitionName,
  );

  // ===Assign core===
  await UIUtils.clickElement(view, "assigned-cores-multiselect");
  await UIUtils.clickElement(view, `multiselect-option-${coreName}`);

  // ===Select base block===
  await UIUtils.clickElement(view, "base-block-dropdown");
  await UIUtils.clickElement(view, baseBlock);

  // ===Enter size===
  await UIUtils.sendKeysToElements(
    view,
    By.css("[data-test='size-stepper'] input[type='text']"),
    sizeKB,
  );

  // ===Create partition and expand details===
  await UIUtils.clickElement(view, "create-partition-button");
  await UIUtils.clickElement(view, "partition-details-chevron");

  // ===Verify partition card exists===
  const partitionTitleCss = `[data-test='${coreName}-partition-card-title'] > h3`;
  const partitionTitleElem = await UIUtils.clickElement(
    view,
    By.css(partitionTitleCss),
  );
  const displayedText = await partitionTitleElem.getText();

  expect(displayedText).to.include(
    partitionName,
    ` Partition '${partitionName}' not found for core '${coreName}'`,
  );
}
