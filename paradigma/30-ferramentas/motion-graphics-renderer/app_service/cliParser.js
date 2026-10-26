/**
 * CLI Argument Parser and Validator for Motion Graphics Renderer Application.
 */
class CliParser {
  constructor(argv = process.argv.slice(2)) {
    this.args = argv;
  }

  parse() {
    const options = {
      videoPath: null,
      prompt: null,
      sources: [],
      name: 'motion_graphics_render',
      html: 'motion_graphics_renderer/example_scene.html',
      duration: 5.0,
      fps: 30,
      width: 1280,
      height: 720,
      help: false
    };

    for (const arg of this.args) {
      if (arg === '--help' || arg === '-h') {
        options.help = true;
        break;
      }
      if (arg.startsWith('--video=')) {
        options.videoPath = arg.split('=')[1];
      } else if (arg.startsWith('--prompt=')) {
        options.prompt = arg.split('=')[1];
      } else if (arg.startsWith('--sources=')) {
        options.sources = arg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
      } else if (arg.startsWith('--name=')) {
        options.name = arg.split('=')[1];
      } else if (arg.startsWith('--html=')) {
        options.html = arg.split('=')[1];
      } else if (arg.startsWith('--duration=')) {
        options.duration = parseFloat(arg.split('=')[1]);
      } else if (arg.startsWith('--fps=')) {
        options.fps = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('--width=')) {
        options.width = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('--height=')) {
        options.height = parseInt(arg.split('=')[1], 10);
      }
    }

    return options;
  }

  printUsage() {
    console.log('============================================================');
    console.log('🎬 MOTION GRAPHICS RENDERER - CLI USAGE');
    console.log('============================================================');
    console.log('Usage:');
    console.log('  node motion_graphics_renderer/app.js --video=<path_to_video> [options]');
    console.log('  node motion_graphics_renderer/app.js --prompt="<text_prompt>" [options]');
    console.log('');
    console.log('Modes:');
    console.log('  1. Video Path Mode (--video): Extracts audio/speech, generates Antonio-neural voiceover, runs pipeline.');
    console.log('  2. Text Prompt Mode (--prompt): Generates script/assets via free API fallback mechanism, runs pipeline.');
    console.log('');
    console.log('Common Options:');
    console.log('  --name=<project_name>   Name of project / output folder (default: motion_graphics_render)');
    console.log('  --html=<path_to_html>   Path to HTML animation template (default: motion_graphics_renderer/example_scene.html)');
    console.log('  --duration=<seconds>    Total duration in seconds (default: 5.0, supports up to 1800s / 30 minutes)');
    console.log('  --fps=<number>          Frames per second (default: 30)');
    console.log('  --width=<pixels>        Video width (default: 1280)');
    console.log('  --height=<pixels>       Video height (default: 720)');
    console.log('  --help, -h              Show this help message');
    console.log('============================================================');
  }
}

module.exports = {
  CliParser
};
