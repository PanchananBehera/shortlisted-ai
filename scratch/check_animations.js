import fs from 'fs';
import path from 'path';

const glbPath = 'd:/ShortListed AI/ai-job-tracker/client/public/avatar/pacobot.glb';

try {
  const buffer = fs.readFileSync(glbPath);
  const chunkLength = buffer.readUInt32LE(12);
  const jsonBuffer = buffer.subarray(20, 20 + chunkLength);
  const jsonContent = JSON.parse(jsonBuffer.toString('utf8'));

  console.log(`\n📦 Nodes in pacobot.glb:`);
  if (jsonContent.nodes) {
    jsonContent.nodes.forEach((node, index) => {
      console.log(`   - [Node ${index}] Name: "${node.name || 'unnamed'}" (Mesh: ${node.mesh !== undefined ? node.mesh : 'none'})`);
    });
  }

  console.log(`\n🎨 Meshes in pacobot.glb:`);
  if (jsonContent.meshes) {
    jsonContent.meshes.forEach((mesh, index) => {
      console.log(`   - [Mesh ${index}] Name: "${mesh.name || 'unnamed'}"`);
    });
  }
} catch (err) {
  console.error('Error reading GLB:', err);
}
