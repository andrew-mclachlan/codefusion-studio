---
description: Supported workspace templates in CodeFusion Studio
author: Analog Devices
date: 2026-01-12
---

# Supported workspace templates

A workspace template is a pre-configured starter project that includes:

- project structure
- build system settings
- device configuration
- example source code
- debug configuration
- VS Code settings (launch.json, tasks, c_cpp_properties)

Templates help you start from a known-good example tailored to a specific SDK and a supported Analog Devices SoC.

The tables below list all templates available in the [Workspace Creation wizard](create-new-workspace.md).

## MSDK templates

| Template                               | Description                                              | Supported SoCs & Boards                                                                                                                                                                                            |
| -------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dual Core Sync**                     | ARM + RISC-V synchronization using hardware semaphores.  | MAX32655 (EVKIT, FTHR), MAX32690 (EVKIT, APARD, FTHR)                                                                                                                                                                    |
| **Multicore Hello World**              | Basic multicore example.                                 | MAX32655 (EVKIT, FTHR), MAX32690 (EVKIT, APARD, FTHR), MAX78000 (EVKIT, FTHR), MAX78002 (EVKIT)                                                                                                                    |
| **Single Core DMA**                    | DMA usage example.                                       | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR)                                                                                                                                                  |
| **Single Core Hello World**            | Basic Hello World.                                       | MAX32650 (EVKIT, FTHR), MAX32655 (EVKIT, FTHR), MAX32660 (EVKIT), MAX32662 (EVKIT), MAX32670 (EVKIT), MAX32672 (EVKIT), MAX32675C (EVKIT), MAX32690 (EVKIT, APARD, FTHR), MAX78000 (EVKIT, FTHR), MAX78002 (EVKIT) |
| **Single Core Hello World C++**        | C++ Hello World.                                         | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR)                                                                                                                                                  |
| **Single Core I2C Scan**               | I²C bus scan for connected devices.                      | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR)                                                                                                                                                  |
| **Single Core ICC**                    | Inter-core communication example.                        | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR)                                                                                                                                                         |
| **Single Core PyTorch AI Model (CNN)** | PyTorch example using the M4 and CNN accelerator.          | MAX78002 (EVKIT)                                                                                                                                                                                                   |
| **Single Core RTC**                    | Real-time clock example.                                 | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR)                                                                                                                                                  |
| **Single Core TensorFlow AI Model**    | TensorFlow Lite Micro example.                           | MAX32690 (EVKIT, APARD, FTHR), MAX78002 (EVKIT)                                                                                                                                                                    |
| **Single Core UART Loopback**          | UART TX→RX loopback test.                                | MAX32655 (EVKIT), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD)                                                                                                                                                        |

## SHARC-FX templates

| Template                                 | Description                                                                              | Supported SoCs & Boards                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **SHARC-FX multicore Hello World**      | SHARC-FX and ARM Hello World template with preload.                    | **ADSP-SC83X** — ADSPSC83X-EV-SOM, EV-SOMCRR-EZKIT                                                       |
| **SHARC-FX multicore with TFLM on ARM** | SHARC-FX and ARM template using TensorFlow Lite Micro on the ARM core. | **ADSP-SC83X** — ADSPSC83X-EV-SOM, EV-SOMCRR-EZKIT                                                       |
| **SHARC-FX singlecore Hello World**     | Single-core SHARC-FX Hello World template.                                      | **ADSP-2183X** — ADSP2183X-EV-SOM, EV-SOMCRR-EZKIT, **ADSP-SC83X** — ADSPSC83X-EV-SOM, EV-SOMCRR-EZKIT |
| **SHARC-FX singlecore with TFLM**       | Single-core SHARC-FX TensorFlow Lite Micro template.                            | **ADSP-2183X** — ADSP2183X-EV-SOM, EV-SOMCRR-EZKIT, **ADSP-SC83X** — ADSPSC83X-EV-SOM, EV-SOMCRR-EZKIT |

## Zephyr templates

| Template                              | Description                          | Supported SoCs & Boards                                           |
| ------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| **Single Core ADC Sequence**          | ADC sequence example.                | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **Single Core Basic Synchronization** | Synchronization primitives demo.     | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **Single Core Blinky**                | LED blink example.                   | All supported MAX devices                                         |
| **Single Core Counter Alarm**         | Counter alarm example.               | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **Single Core Dining Philosophers**   | Classic concurrency demo.            | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **Single Core Hello World C++**             | C++ Hello World.                     | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **Single Core I2C Custom Target**     | Custom I²C target interface.         | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **Single Core LittleFS**              | LittleFS filesystem example.         | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **Single Core Synchronization C++**   | C++ synchronization demo.            | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **Single Core TensorFlow AI Model**   | TensorFlow Lite Micro example.       | MAX32657 (EVKIT), MAX32690 (EVKIT, APARD, FTHR), MAX78002 (EVKIT) |
| **Single Core Watchdog**              | Reset example using Watchdog driver.  | MAX32655 (EVKIT, FTHR), MAX32672 (EVKIT), MAX32690 (EVKIT, APARD, FTHR) |
| **TF-M Secure Partition**             | Trusted Firmware-M secure partition. | MAX32657 (EVKIT), MAX32658 (EVKIT)                                       |
