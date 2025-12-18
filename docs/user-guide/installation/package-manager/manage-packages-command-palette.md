---
description: Use the Command Palette to install, view, or remove packages in CodeFusion Studio.
author: Analog Devices
date: 2025-12-15
---

# Manage packages from VS Code Command Palette

You can use VS Code Command Palette to install, view, and remove packages in CodeFusion Studio as they become available.

To access Package Manager from the Command Palette:

1. Click the gear icon in the lower-left corner of VS Code, then choose **Command Palette**. Alternatively, use the keyboard shortcut (`Ctrl+Shift+P` / `Cmd+Shift+P`).
    ![VS Code settings](../images/access-vs-code-command-palette-dark.png#only-dark)
    ![VS Code settings](../images/access-vs-code-command-palette-light.png#only-light)

2. Type `package`.

    ![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-dark.png#only-dark)
    ![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-light.png#only-light)

## Install a package

1. In the **Command Palette**, type `CFS Install Package` and press Enter.
    ![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-dark.png#only-dark)
    ![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-light.png#only-light)
2. A list of available packages appears.
3. Select the package you need.
4. A progress window shows the installation status. When finished, a confirmation message appears.

## Uninstall a package

1. To uninstall a package, open the **Command Palette** and run `CFS Uninstall Package`.
2. Select a package from the list of installed packages. A progress window will appear during uninstallation, followed by a confirmation message.
