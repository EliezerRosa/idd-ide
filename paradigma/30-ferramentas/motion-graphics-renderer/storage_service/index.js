const fs = require('fs');
const path = require('path');

/**
 * Output Storage & Management Service
 * Responsible for organizing rendered deliverables, versioning, generating metadata JSON,
 * enforcing naming conventions, and cleaning up temporary directories.
 */
class OutputStorageManager {
  constructor(baseOutputDir = path.join(process.cwd(), 'outputs')) {
    this.baseOutputDir = path.resolve(baseOutputDir);
    if (!fs.existsSync(this.baseOutputDir)) {
      fs.mkdirSync(this.baseOutputDir, { recursive: true });
    }
  }

  /**
   * Generates a versioned output directory for a given project/render session.
   * Format: outputs/{projectName}/v{version}/ or outputs/{timestamp}/
   * 
   * @param {string} projectName Name of the project or render job
   * @returns {Object} { versionDir, version, versionNumber }
   */
  createVersionedOutputDirectory(projectName = 'render_job') {
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectRoot = path.join(this.baseOutputDir, sanitizedName);
    
    if (!fs.existsSync(projectRoot)) {
      fs.mkdirSync(projectRoot, { recursive: true });
    }

    // Determine next version number
    const existingEntries = fs.readdirSync(projectRoot, { withFileTypes: true });
    let maxVersion = 0;
    for (const entry of existingEntries) {
      if (entry.isDirectory() && /^v\d+$/.test(entry.name)) {
        const vNum = parseInt(entry.name.substring(1), 10);
        if (vNum > maxVersion) {
          maxVersion = vNum;
        }
      }
    }

    const nextVersionNum = maxVersion + 1;
    const versionStr = `v${nextVersionNum}`;
    const versionDir = path.join(projectRoot, versionStr);
    fs.mkdirSync(versionDir, { recursive: true });

    console.log(`[OutputStorageManager] Created versioned directory: ${versionDir}`);
    return {
      versionDir,
      version: versionStr,
      versionNumber: nextVersionNum,
      projectRoot
    };
  }

  /**
   * Saves render deliverables and generates a comprehensive metadata JSON file.
   * 
   * @param {Object} deliverableInfo
   * @param {string} deliverableInfo.versionDir Target version directory
   * @param {string} deliverableInfo.sourceVideoPath Path to the generated MP4 video file
   * @param {string} [deliverableInfo.sourceAudioPath] Path to the generated audio track (optional)
   * @param {Object} deliverableInfo.projectDefinition Project definition parameters (resolution, fps, duration, etc.)
   * @param {Object} [deliverableInfo.renderStats] Additional rendering stats (render time, frames count, etc.)
   * @returns {Object} { finalVideoPath, metadataPath, metadata }
   */
  saveDeliverable(deliverableInfo) {
    const {
      versionDir,
      sourceVideoPath,
      sourceAudioPath = null,
      projectDefinition = {},
      renderStats = {}
    } = deliverableInfo;

    if (!fs.existsSync(sourceVideoPath)) {
      throw new Error(`Source video file not found: ${sourceVideoPath}`);
    }

    // Copy or move video into versionDir with standardized naming
    const videoFileName = `final_video.mp4`;
    const finalVideoPath = path.join(versionDir, videoFileName);
    fs.copyFileSync(sourceVideoPath, finalVideoPath);

    let finalAudioPath = null;
    if (sourceAudioPath && fs.existsSync(sourceAudioPath)) {
      const audioExt = path.extname(sourceAudioPath);
      finalAudioPath = path.join(versionDir, `audio_track${audioExt}`);
      fs.copyFileSync(sourceAudioPath, finalAudioPath);
    }

    const videoStats = fs.statSync(finalVideoPath);

    // Compile Metadata JSON
    const metadata = {
      schemaVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      project: {
        name: projectDefinition.name || 'motion_graphics_render',
        width: projectDefinition.width || 1920,
        height: projectDefinition.height || 1080,
        frameRate: projectDefinition.frameRate || projectDefinition.fps || 30,
        totalFrames: projectDefinition.totalFrames || (projectDefinition.durationSec ? projectDefinition.durationSec * (projectDefinition.frameRate || 30) : undefined),
        durationSec: projectDefinition.durationSec || (projectDefinition.totalFrames && projectDefinition.frameRate ? projectDefinition.totalFrames / projectDefinition.frameRate : undefined),
        htmlPath: projectDefinition.htmlPath || null
      },
      deliverables: {
        videoFile: videoFileName,
        videoSizeBytes: videoStats.size,
        videoSizeMB: (videoStats.size / (1024 * 1024)).toFixed(2),
        audioFile: finalAudioPath ? path.basename(finalAudioPath) : null
      },
      renderStats: {
        ...renderStats,
        completedAt: new Date().toISOString()
      }
    };

    const metadataPath = path.join(versionDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`[OutputStorageManager] Saved deliverables and metadata to: ${versionDir}`);

    return {
      versionDir,
      finalVideoPath,
      finalAudioPath,
      metadataPath,
      metadata
    };
  }

  /**
   * Cleans up temporary directories (such as frame sequences).
   * 
   * @param {string} tempDirPath Path to temporary directory
   */
  cleanupTempDirectory(tempDirPath) {
    if (tempDirPath && fs.existsSync(tempDirPath)) {
      try {
        fs.rmSync(tempDirPath, { recursive: true, force: true });
        console.log(`[OutputStorageManager] Cleaned up temporary directory: ${tempDirPath}`);
      } catch (err) {
        console.warn(`[OutputStorageManager] Warning: Failed to clean up temp dir ${tempDirPath}:`, err.message);
      }
    }
  }

  /**
   * Enforces retention policy by keeping only the N most recent versions of a project.
   * 
   * @param {string} projectName Project name
   * @param {number} maxVersionsToKeep Number of recent versions to retain
   */
  enforceRetentionPolicy(projectName, maxVersionsToKeep = 5) {
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectRoot = path.join(this.baseOutputDir, sanitizedName);

    if (!fs.existsSync(projectRoot)) return;

    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    const versionDirs = [];

    for (const entry of entries) {
      if (entry.isDirectory() && /^v\d+$/.test(entry.name)) {
        const vNum = parseInt(entry.name.substring(1), 10);
        versionDirs.push({
          name: entry.name,
          num: vNum,
          fullPath: path.join(projectRoot, entry.name)
        });
      }
    }

    // Sort descending by version number
    versionDirs.sort((a, b) => b.num - a.num);

    if (versionDirs.length > maxVersionsToKeep) {
      const toDelete = versionDirs.slice(maxVersionsToKeep);
      for (const oldDir of toDelete) {
        try {
          fs.rmSync(oldDir.fullPath, { recursive: true, force: true });
          console.log(`[OutputStorageManager] Retention policy: Removed old version ${oldDir.name}`);
        } catch (err) {
          console.warn(`[OutputStorageManager] Failed to remove old version ${oldDir.name}:`, err.message);
        }
      }
    }
  }
}

module.exports = {
  OutputStorageManager
};
