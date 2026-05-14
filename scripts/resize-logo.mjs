import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = path.resolve("Mauricarnet_logo.png");
const OUT = path.resolve("public");

if (!fs.existsSync(SRC)) {
  console.error("❌ Mauricarnet_logo.png introuvable à la racine");
  process.exit(1);
}

const sizes = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "favicon.png", size: 32 },
];

for (const { name, size } of sizes) {
  await sharp(SRC)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT, name));
  console.log(`  ✅ ${name} (${size}x${size})`);
}

console.log("\n🎉 Logo redimensionné avec succès dans public/");
