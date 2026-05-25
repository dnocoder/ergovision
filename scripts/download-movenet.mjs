import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const modelDir = join(rootDir, "public", "models", "movenet-lightning");
const modelUrl = "https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/model.json?tfjs-format=file";
const sourceBaseUrl = modelUrl.slice(0, modelUrl.lastIndexOf("/") + 1);
const targetModelJson = join(modelDir, "model.json");
const downloadTimeoutMs = Number(process.env.ERGOVISION_MODEL_DOWNLOAD_TIMEOUT_MS ?? 45000);

async function downloadFile(url, targetPath) {
  const tempPath = `${targetPath}.tmp`;
  await rm(tempPath, { force: true });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), downloadTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await pipeline(response.body, createWriteStream(tempPath));
    await rename(tempPath, targetPath);
  } finally {
    clearTimeout(timeout);
  }
}

function uniqueWeightPaths(model) {
  const paths = new Set();

  for (const group of model.weightsManifest ?? []) {
    for (const path of group.paths ?? []) {
      paths.add(path);
    }
  }

  return [...paths];
}

async function main() {
  if (process.env.ERGOVISION_SKIP_MODEL_DOWNLOAD === "1") {
    console.log("Skipping MoveNet download because ERGOVISION_SKIP_MODEL_DOWNLOAD=1.");
    return;
  }

  await mkdir(modelDir, { recursive: true });
  await downloadFile(modelUrl, targetModelJson);

  const model = JSON.parse(await readFile(targetModelJson, "utf8"));
  const weightPaths = uniqueWeightPaths(model);

  if (weightPaths.length === 0) {
    throw new Error("Downloaded model.json does not contain weightsManifest paths.");
  }

  for (const weightPath of weightPaths) {
    const weightUrl = new URL(weightPath, sourceBaseUrl);
    weightUrl.searchParams.set("tfjs-format", "file");
    await downloadFile(weightUrl.toString(), join(modelDir, weightPath));
  }

  await writeFile(
    join(modelDir, "README.md"),
    [
      "# MoveNet Lightning",
      "",
      "Downloaded by `npm run download:movenet` from TensorFlow Hub.",
      "These files are generated install artifacts and are intentionally not committed.",
      "",
    ].join("\n"),
  );

  console.log(`MoveNet Lightning downloaded to ${modelDir}.`);
}

main().catch(async (error) => {
  await rm(modelDir, { recursive: true, force: true }).catch(() => {});
  console.warn(`MoveNet download skipped: ${error.message}`);
  console.warn("The app can still try the remote TFHub model at runtime.");
});
