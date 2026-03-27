/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import { expect } from "chai";

import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";
import { existsSync } from "fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { CfsPackageReference } from "../src/index.js";

describe("ConanPkgManager", function () {
	const testCacheDir = path.join(process.cwd(), "test_cache");
	const testConfigDir = path.join(process.cwd(), "test_config");
	const testConanHome = path.join(testCacheDir, "conan");
	const testManifestDir = path.join(process.cwd(), "test_manifests"); // Separate dir for manifest test files

	async function cleanCache() {
		await fs.rm(testCacheDir, {
			recursive: true,
			force: true
		});
		await fs.rm(testConfigDir, {
			recursive: true,
			force: true
		});
		await fs.rm(testManifestDir, {
			recursive: true,
			force: true
		});
	}

	async function setupTest() {
		// Run any setup logic before the test suite executes

		// Copy config files to test config dir
		await fs.cp(
			path.resolve("./src/conan-backend/config"),
			testConfigDir,
			{
				recursive: true,
				force: true
			}
		);
		// These tests only use custom remotes
		await fs.rename(
			path.join(testConfigDir, "managedRemotes.json"),
			path.join(testConfigDir, "customRemotes.json")
		);
		// Make sure our custom remotes file is copied
		await fs.rm(path.join(testConfigDir, ".conanignore"), {
			force: true
		});

		// Ensure test manifest directory exists
		await fs.mkdir(testManifestDir, { recursive: true });
	}

	const api = new ConanPkgManager({
		conanHome: testConanHome,
		indexDir: testCacheDir,
		conanConfigPath: testConfigDir
	});

	// Helper to create a manifest file for testing with proper typing
	async function createManifestFile(
		tempManifestPath: string,
		packages: CfsPackageReference[]
	): Promise<string> {
		const manifest = {
			version: 1,
			packages
		};
		await fs.writeFile(tempManifestPath, JSON.stringify(manifest));
		return tempManifestPath;
	}

	before(cleanCache);
	after(cleanCache);

	before(setupTest);

	describe("init method", () => {
		it("should complete without errors", async function () {
			await api.init();
		});
	});

	// Note that this tests not only serve the purpose of testing the APIs but they also
	// allow test to run offline
	describe("Retrieve and delete all remote servers", () => {
		it("must leave an empty list of remote servers", async () => {
			const remotes = await api.listRemotes();
			expect(remotes).to.be.an("array").that.is.not.empty;
			for (const { name } of remotes) {
				await api.deleteRemote(name);
			}
			expect(await api.listRemotes()).to.be.an("array").that.is.empty;
		});
	});

	describe("Add a new server", () => {
		it("should complete without errors", async function () {
			await api.addRemote(
				"local-test-server",
				"http://localhost:9300"
			);
		});
	});

	describe("Login to remote server", () => {
		it("should return an error if credentials are invalid", async function () {
			return api
				.login(
					"local-test-server",
					"invalid_user",
					"invalid_password"
				)
				.then(
					() => {
						expect.fail("Should not succeed");
					},
					(error) => {
						expect(error).to.be.an("Error");
						expect((error as Error).message).to.include(
							"Wrong user or password."
						);
					}
				);
		});

		it("should complete without errors with valid credentials", async function () {
			await api.login(
				"local-test-server",
				"test_user",
				"test_password"
			);
		});
	});

	describe("Logout from remote server", () => {
		it("should complete without errors", async function () {
			await api.logout("local-test-server");
		});
	});

	describe("Before package installation", () => {
		describe("list method", () => {
			describe("without arguments", () => {
				it("should return an empty list", async function () {
					expect(await api.list()).to.be.empty;
				});
			});
			describe("with pattern argument", () => {
				it("should return an empty list", async function () {
					expect(await api.list("any_pattern")).to.be.empty;
				});
			});
		});
	});

	const pkgDepInfo = [
		{ ref: { name: "test_pkg1", version: "1.0" }, deps: [] },
		{ ref: { name: "test_pkg2", version: "1.0" }, deps: [] },
		{
			ref: { name: "test_pkg_consumer1", version: "1.0" },
			deps: [
				{ name: "test_pkg_dep1", version: "1.0" },
				{ name: "test_pkg_dep1dep", version: "1.0" }
			]
		},
		{
			ref: { name: "test_pkg_consumer12", version: "1.0" },
			deps: [
				{ name: "test_pkg_dep1", version: "1.0" },
				{ name: "test_pkg_dep2", version: "1.0" },
				{ name: "test_pkg_dep1dep", version: "1.0" }
			]
		}
	];

	pkgDepInfo.forEach(function (pkg) {
		describe(`dependencies(${pkg.ref.name}/${pkg.ref.version})`, function () {
			it("must return all package dependencies", async function () {
				expect(await api.dependencies(pkg.ref))
					.to.be.an("array")
					.that.include.deep.members(pkg.deps);
			});
		});

		describe(`When ${pkg.ref.name} is installed`, () => {
			const expectedInstalledPackages = [pkg.ref, ...pkg.deps];
			it("must return all newly installed packages", async function () {
				expect(await api.install(pkg.ref))
					.to.be.an("array")
					.that.include.deep.members(expectedInstalledPackages);
			});
			it("must be listed by list method", async function () {
				expect(await api.list())
					.to.be.an("array")
					.that.deep.includes(pkg.ref);
			});
			pkg.deps.forEach(function (dep) {
				it(`also installs the dependency ${dep.name}/${dep.version}`, async function () {
					expect(await api.list()).to.deep.include(dep);
				});
				it(`dependency ${dep.name} cannot be uninstalled`, async function () {
					return api.uninstall(dep.name).then(
						() => {
							expect.fail("Should not succeed");
						},
						() => {
							// Expected error
						}
					);
				});
			});

			expectedInstalledPackages.forEach(function (ref) {
				describe(`When ${ref.name} path is requested`, function () {
					it("Returned path exist", async function () {
						expect(existsSync(await api.getPath(ref.name))).to.be
							.true;
					});
				});
			});

			describe("When uninstalled", function () {
				it("succeed to be uninstalled", async function () {
					await api.uninstall(pkg.ref.name);
				});
				it("no longer is listed", async function () {
					expect(await api.list())
						.to.be.an("array")
						.that.not.deep.includes(pkg.ref);
				});
				pkg.deps.forEach(function (dep) {
					describe(`Dependency ${dep.name}/${dep.version}`, function () {
						it("can be uninstalled", async function () {
							await api.uninstall(dep.name);
						});
						it("is no longer listed", async function () {
							expect(await api.list())
								.to.be.an("array")
								.that.not.deep.includes(dep);
						});
					});
				});
			});
		});
	});

	describe("Dependency version conflict", function () {
		// Scenario: test_pkg_consumer1/1.0 depends on test_pkg_dep1/1.0
		//           test_pkg_consumer1/2.0 depends on test_pkg_dep1/2.0
		// Installing consumer1/1.0 first (bringing in dep1/1.0), then trying
		// to install consumer1/2.0 should fail because dep1 would need to be
		// upgraded to 2.0, which conflicts with the already-installed dep1/1.0.

		before(async function () {
			this.timeout(20000);
			// Step 1: Install test_pkg_consumer1/1.0 which pulls in test_pkg_dep1/1.0
			const result = await api.install({
				name: "test_pkg_consumer1",
				version: "1.0"
			});
			expect(result).to.be.an("array").that.deep.includes({
				name: "test_pkg_consumer1",
				version: "1.0"
			});
			expect(result).to.deep.include({
				name: "test_pkg_dep1",
				version: "1.0"
			});
		});

		after(async function () {
			// Clean up installed packages
			const pkgs = [
				"test_pkg_consumer1",
				"test_pkg_dep1",
				"test_pkg_dep1dep"
			];
			for (const pkg of pkgs) {
				try {
					await api.uninstall(pkg);
				} catch {
					// Ignore if not installed
				}
			}
		});

		it("should have test_pkg_consumer1/1.0 and test_pkg_dep1/1.0 installed", async function () {
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_consumer1" && p.version === "1.0"
				)
			).to.be.true;
			expect(
				installedPackages.some(
					(p) => p.name === "test_pkg_dep1" && p.version === "1.0"
				)
			).to.be.true;
		});

		it("should fail to install test_pkg_consumer1/2.0 due to dependency conflict with test_pkg_dep1", async function () {
			// Step 2: Try to install test_pkg_consumer1/2.0 which requires test_pkg_dep1/2.0
			// This should fail because test_pkg_dep1/1.0 is already installed as a dependency
			// of test_pkg_consumer1/1.0, and upgrading it would break the existing consumer
			return api
				.install({
					name: "test_pkg_consumer1",
					version: "2.0"
				})
				.then(
					() => {
						expect.fail(
							"Should have failed due to dependency version conflict"
						);
					},
					(error) => {
						expect(error).to.be.an("Error");
					}
				);
		});

		it("should still have the original packages installed after failed upgrade", async function () {
			// Verify the original installation is still intact
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_consumer1" && p.version === "1.0"
				)
			).to.be.true;
			expect(
				installedPackages.some(
					(p) => p.name === "test_pkg_dep1" && p.version === "1.0"
				)
			).to.be.true;
		});
	});

	describe("Version range handling", function () {
		// Clean up test packages before each test to ensure consistent state
		beforeEach(async function () {
			const pkgs = ["test_pkg1", "test_pkg2"];
			for (const pkg of pkgs) {
				try {
					await api.uninstall(pkg);
				} catch (error) {
					// Ignore errors if package is not installed
				}
				try {
					await api.delete(`${pkg}/*`);
				} catch (error) {
					// Ignore errors if package doesn't exist in cache
				}
			}
		});

		it("should install package with exact version 1.0", async function () {
			const result = await api.install({
				name: "test_pkg1",
				version: "1.0"
			});
			expect(result)
				.to.be.an("array")
				.that.deep.includes({ name: "test_pkg1", version: "1.0" });
		});

		it("should install package with caret version ^1.0 (latest minor in 1.x)", async function () {
			const result = await api.install({
				name: "test_pkg2",
				version: "^1.0"
			});
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.3.4"
			});
		});

		it("should install package with tilde version ~1.2 (latest patch in 1.2.x)", async function () {
			const result = await api.install({
				name: "test_pkg2",
				version: "~1.2"
			});
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.2.3"
			});
		});

		it("should install package with version range '>=1.2.0 <1.3.0' (latest in range)", async function () {
			const result = await api.install({
				name: "test_pkg2",
				version: ">=1.2.0 <1.3.0"
			});
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.2.3"
			});
		});

		it("should install multiple packages at once", async function () {
			const result = await api.install([
				{ name: "test_pkg1", version: "1.0" },
				{ name: "test_pkg2", version: "1.0" }
			]);
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg1",
				version: "1.0"
			});
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.0"
			});

			// Verify both packages are now installed
			const installedPackages = await api.list();
			expect(installedPackages).to.deep.include({
				name: "test_pkg1",
				version: "1.0"
			});
			expect(installedPackages).to.deep.include({
				name: "test_pkg2",
				version: "1.0"
			});
		});

		it("should install multiple packages with version ranges at once", async function () {
			const result = await api.install([
				{ name: "test_pkg1", version: "^1.0" },
				{ name: "test_pkg2", version: "~1.2" }
			]);
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg1",
				version: "1.0"
			});
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.2.3"
			});
		});

		it("should fail when installing multiple packages with one invalid package", async function () {
			try {
				await api.install([
					{ name: "test_pkg1", version: "1.0" },
					{ name: "nonexistent_pkg", version: "1.0" }
				]);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).to.be.an("Error");
				expect((error as Error).message).to.include("nonexistent_pkg");
			}
		});

		it("should fail when installing multiple nonexistent packages", async function () {
			try {
				await api.install([
					{ name: "nonexistent_pkg1", version: "1.0" },
					{ name: "nonexistent_pkg2", version: "2.0" }
				]);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).to.be.an("Error");
			}
		});

		it("should return empty array when installing empty package list", async function () {
			const result = await api.install([]);
			expect(result).to.be.an("array").that.is.empty;
		});
	});

	describe("Search command", function () {
		it("Returns all packages starting by 'test_pkg'", async function () {
			expect(await api.search("test_pkg*"))
				.to.be.an("array")
				.that.include.deep.members([
					{ name: "test_pkg1", version: "1.0" },
					{ name: "test_pkg2", version: "1.0" },
					{ name: "test_pkg_dep1dep", version: "1.0" },
					{ name: "test_pkg_dep1", version: "1.0" },
					{ name: "test_pkg_dep2", version: "1.0" },
					{ name: "test_pkg_consumer1", version: "1.0" },
					{ name: "test_pkg_consumer2", version: "1.0" },
					{ name: "test_pkg_consumer12", version: "1.0" }
				]);
		});
		it("Returns all packages starting by 'test_pkg_dep'", async function () {
			expect(await api.search("test_pkg_dep*"))
				.to.be.an("array")
				.that.include.deep.members([
					{ name: "test_pkg_dep1dep", version: "1.0" },
					{ name: "test_pkg_dep1", version: "1.0" },
					{ name: "test_pkg_dep2", version: "1.0" }
				]);
		});
	});

	describe("localConsumers", function () {
		describe("run on on test_pkg_dep1dep", function () {
			describe("Before package is installed", function () {
				it("must return an error", async function () {
					return api.localConsumers("test_pkg_dep1dep").then(
						() => {
							expect.fail("Should not succeed");
						},
						() => {
							// Expected failure
						}
					);
				});
			});
			describe("After package is installed", function () {
				before(async function () {
					await api.install({
						name: "test_pkg_dep1dep",
						version: "1.0"
					});
				});
				after(async function () {
					await api.uninstall("test_pkg_dep1dep");
				});

				it("must return an empty list", async function () {
					expect(
						await api.localConsumers("test_pkg_dep1dep")
					).to.be.an("array").that.is.empty;
				});

				describe("After test_pkg_dep1 is installed", function () {
					before(async function () {
						await api.install({
							name: "test_pkg_dep1",
							version: "1.0"
						});
					});
					after(async function () {
						await api.uninstall("test_pkg_dep1");
					});

					it("must include test_pkg_dep1 as a consumer", async function () {
						expect(await api.localConsumers("test_pkg_dep1dep"))
							.to.be.an("array")
							.that.include.deep.members([
								{ name: "test_pkg_dep1", version: "1.0" }
							]);
					});
					describe("After test_pkg_consumer1 is installed", function () {
						before(async function () {
							await api.install({
								name: "test_pkg_consumer1",
								version: "1.0"
							});
						});
						after(async function () {
							await api.uninstall("test_pkg_consumer1");
						});

						it("must include test_pkg_consumer1 as a consumer", async function () {
							expect(await api.localConsumers("test_pkg_dep1dep"))
								.to.be.an("array")
								.that.include.deep.members([
									{ name: "test_pkg_dep1", version: "1.0" },
									{ name: "test_pkg_consumer1", version: "1.0" }
								]);
						});
					});
				});
			});
		});
	});

	const packageInfo = [
		{
			reference: { name: "test_pkg_plugin1", version: "1.0" },
			description: "A test package setting pkg type to plugin",
			license: "The license of the plugin",
			cfsVersion: "1.1.0",
			soc: ["plugin1Soc"],
			type: "plugin"
		},
		{
			reference: { name: "test_pkg_plugin2", version: "1.0" },
			description: "Another test package setting pkg type to plugin",
			license: "The license of the plugin",
			cfsVersion: "2.0.0",
			soc: ["plugin2Soc1", "plugin2Soc2"],
			type: "plugin"
		},
		{
			reference: { name: "test_pkg1", version: "1.0" },
			description: "A basic recipe",
			license: "<Your project license goes here>",
			cfsVersion: ""
		}
	];

	packageInfo.forEach((pkg) => {
		const referenceString = `${pkg.reference.name}/${pkg.reference.version}`;
		describe(`getPackageInfo(${referenceString})`, () => {
			it("Must return expected fields", async () => {
				const info = await api.getPackageInfo(pkg.reference);
				expect(info).to.deep.equal(pkg);
			});
		});
	});

	describe("list filtering", function () {
		const pkgsToInstall = [
			{ name: "test_pkg_plugin1", version: "1.0" },
			{ name: "test_pkg_plugin2", version: "1.0" },
			{ name: "test_pkg1", version: "1.0" },
			{ name: "test_pkg_consumer12", version: "1.0" }
		];
		before(async () => {
			for (const pkg of pkgsToInstall) {
				await api.install(pkg);
			}
		});
		after(async () => {
			for (const pkg of pkgsToInstall.reverse()) {
				await api.uninstall(pkg.name);
			}
		});

		const filtersToTest: {
			filter: Record<string, string | string[]>;
			expectedOutput: { name: string; version: string }[];
		}[] = [
			{
				filter: { soc: "plugin2Soc1" },
				expectedOutput: [{ name: "test_pkg_plugin2", version: "1.0" }]
			},
			{
				filter: { soc: "plugin1Soc" },
				expectedOutput: [{ name: "test_pkg_plugin1", version: "1.0" }]
			},
			{
				filter: { soc: ["plugin1Soc", "plugin2Soc1"] },
				expectedOutput: [
					{ name: "test_pkg_plugin1", version: "1.0" },
					{ name: "test_pkg_plugin2", version: "1.0" }
				]
			},
			{
				filter: { soc: "plugin1Soc", cfsVersion: "2.0.0" },
				expectedOutput: []
			},
			{
				filter: { soc: "plugin1Soc", type: "plugin" },
				expectedOutput: [{ name: "test_pkg_plugin1", version: "1.0" }]
			},
			{
				filter: { soc: "non-existing-soc", type: "not-plugin" },
				expectedOutput: []
			},
			{
				filter: { soc: "non-existing-soc" },
				expectedOutput: []
			},
			{
				filter: { type: "plugin" },
				expectedOutput: [
					{ name: "test_pkg_plugin1", version: "1.0" },
					{ name: "test_pkg_plugin2", version: "1.0" }
				]
			},
			{
				filter: { type: ["plugin", "not-plugin"] },
				expectedOutput: [
					{ name: "test_pkg_plugin1", version: "1.0" },
					{ name: "test_pkg_plugin2", version: "1.0" }
				]
			}
		] as const;
		for (const { filter, expectedOutput } of filtersToTest) {
			describe(`list("*",${JSON.stringify(filter)})`, () => {
				const expectedReturnString =
					expectedOutput.length > 0
						? expectedOutput
								.map(({ name, version }) => {
									return `${name}/${version}`;
								})
								.join(", ")
						: "an empty array";
				it(`must return ${expectedReturnString}`, async function () {
					expect(await api.list("*", filter)).to.deep.equal(
						expectedOutput
					);
				});
			});
		}
	});

	describe("Manifest handling", function () {
		const tempManifestPath = path.join(
			testManifestDir,
			"test-manifest.json"
		);

		before(async function () {
			this.timeout(20000); // Increase timeout for installation
			// Ensure the test directory exists before each test
			await fs.mkdir(testCacheDir, { recursive: true });
			// Install some packages to have a baseline of "installed" packages for the tests
			await api.install({ name: "test_pkg1", version: "1.0" });
			await api.install({ name: "test_pkg2", version: "1.0" });
		});

		after(async function () {
			try {
				await api.uninstall("test_pkg1");
			} catch (error) {
				// Ignore errors if package is not installed
			}
			try {
				await api.uninstall("test_pkg2");
			} catch (error) {
				// Ignore errors if package is not installed
			}
		});

		afterEach(function (done) {
			// Clean up the manifest file after each test
			fs.unlink(tempManifestPath)
				.then(() => {
					done();
				})
				.catch(() => {
					done();
				}); // Ignore errors if file doesn't exist
		});

		describe("checkManifest", function () {
			it("should return empty array when all packages are installed", async function () {
				// Create a manifest with packages that are already installed
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[
						{ name: "test_pkg1", version: "1.0" },
						{ name: "test_pkg2", version: "1.0" }
					]
				);
				const result = await api.checkManifest(manifestPath);
				expect(result).to.be.an("array").that.is.empty;
			});
			it("should return missing packages when some packages are not installed", async function () {
				// Create a manifest with one installed and one not installed package
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[
						{ name: "test_pkg1", version: "1.0" }, // installed
						{ name: "test_pkg_consumer1", version: "1.0" } // not installed
					]
				);
				const result = await api.checkManifest(manifestPath);
				expect(result).to.be.an("array").with.lengthOf(1);
				expect(result[0]).to.deep.equal({
					name: "test_pkg_consumer1",
					version: "1.0"
				});
			});

			it("should handle manifest files with invalid format", async function () {
				// Create an invalid manifest file
				const invalidManifestPath = path.join(
					testManifestDir,
					"invalid-manifest.json"
				);
				await fs.writeFile(
					invalidManifestPath,
					JSON.stringify({ version: 1 })
				);

				return api
					.checkManifest(invalidManifestPath)
					.then(
						() => {
							expect.fail("Should not succeed with invalid format");
						},
						(error: Error) => {
							expect(error).to.be.an("Error");
							expect(error.message).to.include(
								"Invalid manifest format. Must contain 'version' and 'packages' fields."
							);
						}
					)
					.finally(() => {
						// Clean up invalid manifest file, ignore errors
						fs.unlink(invalidManifestPath).catch(() => {
							// Ignore errors during cleanup
						});
					});
			});
		});

		describe("installFromManifest", function () {
			it("should not install anything when all packages are already installed", async function () {
				// Create a manifest with packages that are already installed
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[
						{ name: "test_pkg1", version: "1.0" },
						{ name: "test_pkg2", version: "1.0" }
					]
				);
				const result = await api.installFromManifest(manifestPath);
				expect(result).to.be.an("array").that.is.empty;
			});
			it("should install only packages that are not already installed", async function () {
				// Create a manifest with one installed and one not installed packages
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[
						{ name: "test_pkg1", version: "1.0" }, // installed
						{ name: "test_pkg_consumer1", version: "1.0" } // not installed
					]
				);

				try {
					const result = await api.installFromManifest(manifestPath);
					expect(result).to.be.an("array").with.length.greaterThan(0);
					expect(result).to.deep.include({
						name: "test_pkg_consumer1",
						version: "1.0"
					});

					// Verify the package is now installed
					const installedPackages = await api.list();
					expect(
						installedPackages.some(
							(p) =>
								p.name === "test_pkg_consumer1" && p.version === "1.0"
						)
					).to.be.true;
				} finally {
					// Clean up - uninstall the package we just installed
					try {
						await api.uninstall("test_pkg_consumer1");
						await api.uninstall("test_pkg_dep1");
						await api.uninstall("test_pkg_dep1dep");
					} catch (error) {
						// Ignore errors during cleanup
					}
				}
			});
			it("should handle invalid manifest file paths", async function () {
				return api
					.installFromManifest("/non-existent-path.json")
					.then(
						() => {
							expect.fail("Should not succeed with invalid path");
						},
						(error: Error) => {
							expect(error).to.be.an("Error");
							expect(error.message).to.include(
								"Manifest file not found"
							);
						}
					);
			});
		});

		describe("Version test handling", function () {
			beforeEach(async function () {
				// Clear any installed packages to ensure installFromManifest actually installs them
				// Using test_pkg1 and test_pkg2 as they have no dependencies
				try {
					await api.uninstall("test_pkg1");
				} catch (error) {
					// Ignore errors if package is not installed
				}
				try {
					await api.uninstall("test_pkg2");
				} catch (error) {
					// Ignore errors if package is not installed
				}

				try {
					await api.delete("test_pkg*");
				} catch (error) {
					// Ignore errors if package doesn't exist in cache
				}
			});

			it("should handle manifest with version ranges", async function () {
				// Create a manifest with various version range formats
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[
						{ name: "test_pkg1", version: "~1.0" }, // tilde range (1.0.x patch range)
						{ name: "test_pkg2", version: "^1.0" } // caret range (should get 1.3.4)
					]
				);

				try {
					const result = await api.installFromManifest(manifestPath);
					expect(result).to.be.an("array").with.length.greaterThan(0);

					// Verify the packages are now installed
					const installedPackages = await api.list();

					// Verify both packages were installed
					expect(result).to.deep.include({
						name: "test_pkg1",
						version: "1.0"
					});
					expect(result).to.deep.include({
						name: "test_pkg2",
						version: "1.3.4"
					});

					expect(
						installedPackages.some(
							(p) => p.name === "test_pkg1" && p.version === "1.0"
						)
					).to.be.true;
					expect(
						installedPackages.some(
							(p) => p.name === "test_pkg2" && p.version === "1.3.4"
						)
					).to.be.true;
				} finally {
					// Clean up - uninstall the packages we just installed
					try {
						await api.uninstall("test_pkg1");
						await api.uninstall("test_pkg2");
					} catch (error) {
						// Ignore errors during cleanup
					}
				}
			});

			it("should handle manifest with explicit version range syntax", async function () {
				// Create a manifest with explicit range syntax using test_pkg2
				// >=1.2.0 <1.3.0 should match 1.2.0-1.2.3 and select 1.2.3
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[{ name: "test_pkg2", version: ">=1.2.0 <1.3.0" }]
				);

				const result = await api.installFromManifest(manifestPath);
				expect(result).to.be.an("array").with.length.greaterThan(0);

				// Verify package was installed with version 1.2.3 (latest in range)
				expect(result).to.deep.include({
					name: "test_pkg2",
					version: "1.2.3"
				});

				// Verify the package is now installed
				const installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.3"
					)
				).to.be.true;
			});

			it("should not re-install package via manifest when installed version satisfies the range", async function () {
				// Step 1: Install test_pkg2 with explicit version 1.3.1
				await api.install({ name: "test_pkg2", version: "1.3.1" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.1"
					)
				).to.be.true;

				// Step 2: Apply a manifest with ~1.3 (meaning >=1.3.0 <1.4.0)
				// The installed version 1.3.1 satisfies this range, so the manifest
				// should not trigger a re-install.
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[{ name: "test_pkg2", version: "~1.3" }]
				);

				const result = await api.installFromManifest(manifestPath);

				// No packages should be installed since 1.3.1 satisfies ~1.3
				expect(result).to.be.an("array").with.lengthOf(0);

				// The version should remain 1.3.1
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.1"
					)
				).to.be.true;
			});

			it("should downgrade explicitly installed package when manifest specifies a non-overlapping range", async function () {
				// Known behavior: if a user explicitly installs a version (e.g. 1.3.4)
				// and then applies a manifest with a range that excludes it (e.g. >=1.2 <1.3),
				// the manifest will downgrade the package to the latest version in the range.
				// The manifest always overrides the explicitly installed version.

				// Step 1: Explicitly install the latest version
				await api.install({ name: "test_pkg2", version: "1.3.4" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.4"
					)
				).to.be.true;

				// Step 2: Apply a manifest with range >=1.2 <1.3 which excludes the installed 1.3.4
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[{ name: "test_pkg2", version: ">=1.2 <1.3" }]
				);

				const result = await api.installFromManifest(manifestPath);

				// The manifest overrides the explicitly installed version
				expect(result).to.be.an("array").with.length.greaterThan(0);

				// Package is downgraded to 1.2.3 (latest matching >=1.2 <1.3)
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.3"
					)
				).to.be.true;

				// The previously installed 1.3.4 is no longer installed
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.4"
					)
				).to.be.false;
			});

			it("should update to latest version when explicitly installing with a version range", async function () {
				// Scenario: User installs specific versions, then explicitly installs with a range
				// Unlike installFromManifest, explicit install with a range should resolve to the latest matching version

				// Step 1: Install test_pkg2 with version 1.2.0
				await api.install({ name: "test_pkg2", version: "1.2.0" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;

				// Step 2: Install test_pkg2 with version 1.1.0 (downgrade)
				await api.install({ name: "test_pkg2", version: "1.1.0" });

				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.1.0"
					)
				).to.be.true;
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.false;

				// Step 3: Install with a tilde range ~1.0 which should resolve to the latest 1.0.x patch
				// This is an explicit install (not manifest), so it should update to the latest matching version
				const result = await api.install({
					name: "test_pkg2",
					version: "~1.0"
				});

				expect(result).to.be.an("array").that.is.not.empty;

				// Verify the latest version matching ~1.0 is now installed
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.0"
					)
				).to.be.true;

				// The previous version should no longer be installed
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.1.0"
					)
				).to.be.false;
			});

			it("should resolve version range from local cache when localOnly flag is used", async function () {
				// Scenario: User installs specific versions (populating cache), uninstalls them,
				// then installs with a range using localOnly flag - should resolve from cached versions

				// Step 1: Install test_pkg2 with version 1.2.0 to populate cache
				await api.install({ name: "test_pkg2", version: "1.2.0" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;

				// Step 2: Install test_pkg2 with version 1.1.0 to also add it to cache
				await api.install({ name: "test_pkg2", version: "1.1.0" });

				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.1.0"
					)
				).to.be.true;

				// Step 3: Uninstall to clear installed state (but versions remain in cache)
				await api.uninstall("test_pkg2");

				installedPackages = await api.list();
				expect(installedPackages.some((p) => p.name === "test_pkg2"))
					.to.be.false;

				// Step 4: Install with a version range using localOnly flag
				// ^1.0 means >=1.0.0 <2.0.0, so it should resolve from cached versions
				// Since 1.1.0 and 1.2.0 are cached, it should pick 1.2.0 (latest matching ^1.0)
				const result = await api.install(
					{ name: "test_pkg2", version: "^1.0" },
					{ localOnly: true }
				);

				expect(result).to.be.an("array").that.is.not.empty;

				// Verify the best cached version matching ^1.0 is installed
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;
			});

			it("should resolve manifest version range from local cache when localOnly flag is used", async function () {
				// Scenario: User installs specific versions (populating cache), uninstalls them,
				// then uses installFromManifest with localOnly flag - should resolve from cached versions

				// Step 1: Install test_pkg2 with version 1.2.0 to populate cache
				await api.install({ name: "test_pkg2", version: "1.2.0" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;

				// Step 2: Install test_pkg2 with version 1.1.0 to also add it to cache
				await api.install({ name: "test_pkg2", version: "1.1.0" });

				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.1.0"
					)
				).to.be.true;

				// Step 3: Uninstall to clear installed state (but versions remain in cache)
				await api.uninstall("test_pkg2");

				installedPackages = await api.list();
				expect(installedPackages.some((p) => p.name === "test_pkg2"))
					.to.be.false;

				// Step 4: Install from manifest with localOnly flag using a version range
				// ^1.0 means >=1.0.0 <2.0.0, so it should resolve from cached versions
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[{ name: "test_pkg2", version: "^1.0" }]
				);

				const result = await api.installFromManifest(manifestPath, {
					localOnly: true
				});

				expect(result).to.be.an("array").that.is.not.empty;

				// Verify the best cached version matching ^1.0 is installed
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;
			});

			it("should fail when manifest references uncached package with localOnly flag", async function () {
				// Scenario: installFromManifest with localOnly should fail if the package
				// is not available in the local cache

				// Create a manifest referencing a version range that has no cached versions
				// We use an impossible version to ensure nothing is in cache
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[{ name: "test_pkg2", version: "^99.0" }]
				);

				return api
					.installFromManifest(manifestPath, {
						localOnly: true
					})
					.then(
						() => {
							expect.fail(
								"Should have failed when package is not in cache with localOnly flag"
							);
						},
						(error) => {
							expect(error).to.be.an("Error");
							expect((error as Error).message).to.match(
								/not resolved: No remote defined|No versions found matching/
							);
						}
					);
			});

			it("should resolve version with | in version range", async function () {
				// Create a manifest with a version range that includes an OR condition
				const manifestPath = await createManifestFile(
					tempManifestPath,
					[
						{
							name: "test_pkg2",
							version: ">=1.2.0 <1.3.0 || >=1.3.4 <1.4.0"
						}
					]
				);

				const result = await api.installFromManifest(manifestPath);
				expect(result).to.be.an("array").with.length.greaterThan(0);

				// Verify the version installed is 1.3.4 (latest matching the first range)
				const installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.4"
					)
				).to.be.true;
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.3"
					)
				).to.be.false;
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.0"
					)
				).to.be.false;
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.4.0"
					)
				).to.be.false;
			});
		});
	});

	describe("Pre-release version handling", function () {
		afterEach(async function () {
			try {
				await api.uninstall("test_pkg_prerelease");
			} catch {
				// Ignore if not installed
			}
		});

		after(async function () {
			await fs
				.unlink(
					path.join(testManifestDir, "test-prerelease-manifest.json")
				)
				.catch(() => undefined);
		});

		it("should install a package with a pre-release version via install", async function () {
			const result = await api.install({
				name: "test_pkg_prerelease",
				version: "1.0.0-beta.1+1"
			});
			expect(result).to.be.an("array").that.deep.includes({
				name: "test_pkg_prerelease",
				version: "1.0.0-beta.1+1"
			});

			// Verify the package is listed as installed
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease" &&
						p.version === "1.0.0-beta.1+1"
				)
			).to.be.true;
		});

		it("should install a package with a pre-release version via installFromManifest", async function () {
			const tempManifestPath = path.join(
				testManifestDir,
				"test-prerelease-manifest.json"
			);
			const manifestPath = await createManifestFile(
				tempManifestPath,
				[
					{
						name: "test_pkg_prerelease",
						version: "1.0.0-beta.1+1"
					}
				]
			);

			const result = await api.installFromManifest(manifestPath);
			expect(result).to.be.an("array").that.deep.includes({
				name: "test_pkg_prerelease",
				version: "1.0.0-beta.1+1"
			});

			// Verify the package is listed as installed
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease" &&
						p.version === "1.0.0-beta.1+1"
				)
			).to.be.true;
		});

		it("should fail to install a pre-release package when explicit version is not defined", async function () {
			return api
				.install({
					name: "test_pkg_prerelease",
					version: "~1.0.0"
				})
				.then(
					() => {
						expect.fail(
							"Should not succeed without explicit pre-release version"
						);
					},
					(error) => {
						expect(error).to.be.an("Error");
					}
				);
		});
	});

	describe("getInstalledPackageInfo", function () {
		const pkgsToInstall = [
			{ name: "test_pkg_plugin1", version: "1.0" },
			{ name: "test_pkg_plugin2", version: "1.0" },
			{ name: "test_pkg1", version: "1.0" },
			{ name: "test_pkg_consumer12", version: "1.0" }
		];

		before(async function () {
			this.timeout(20000); // Increase timeout for installation
			for (const pkg of pkgsToInstall) {
				await api.install(pkg);
			}
		});

		after(async function () {
			for (const pkg of pkgsToInstall.reverse()) {
				await api.uninstall(pkg.name);
			}
		});

		it("should return all installed packages with name, version, path", async function () {
			const result = await api.getInstalledPackageInfo();
			expect(result).to.be.an("array");
			expect(result.length).to.be.greaterThan(0);

			// Verify each package has the required properties
			for (const pkg of result) {
				expect(pkg).to.have.property("name");
				expect(pkg).to.have.property("version");
				expect(pkg).to.have.property("path");

				// Verify path exists
				expect(existsSync(pkg.path)).to.be.true;
			}

			// Verify all installed packages are included
			const names = result.map((pkg) => pkg.name);
			expect(names).to.include("test_pkg_plugin1");
			expect(names).to.include("test_pkg_plugin2");
			expect(names).to.include("test_pkg1");
			expect(names).to.include("test_pkg_consumer12");
		});

		describe("with filter", function () {
			it("should return only packages with type 'plugin'", async function () {
				const result = await api.getInstalledPackageInfo({
					type: "plugin"
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(2);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_plugin1",
					"test_pkg_plugin2"
				]);

				// Verify all returned packages have type 'plugin'
				for (const pkg of result) {
					expect(pkg.type).to.equal("plugin");
				}
			});

			it("should return packages matching single value", async function () {
				const result = await api.getInstalledPackageInfo({
					soc: "plugin1Soc"
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(1);
				expect(result[0].name).to.equal("test_pkg_plugin1");
			});

			it("should return packages matching any value in array filter", async function () {
				const result = await api.getInstalledPackageInfo({
					soc: ["plugin1Soc", "plugin2Soc1"]
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(2);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_plugin1",
					"test_pkg_plugin2"
				]);
			});

			it("should return packages matching two filter properties", async function () {
				const result = await api.getInstalledPackageInfo({
					type: "plugin",
					soc: "plugin1Soc"
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(1);
				expect(result[0].name).to.equal("test_pkg_plugin1");
				expect(result[0].type).to.equal("plugin");
			});

			it("should return empty array when filters don't match any package", async function () {
				const result = await api.getInstalledPackageInfo({
					type: "plugin",
					soc: "non-existent-soc"
				});
				expect(result).to.be.an("array").that.is.empty;
			});

			it("should handle array filter values with multiple properties", async function () {
				const result = await api.getInstalledPackageInfo({
					type: ["plugin", "tool"],
					soc: ["plugin1Soc", "plugin2Soc2"]
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(2);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_plugin1",
					"test_pkg_plugin2"
				]);
			});
		});
	});
});
