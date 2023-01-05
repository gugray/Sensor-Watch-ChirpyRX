import {SoundAnalyzer} from "./soundAnalyzer.js";

let soundAnalyzer = null;
let elmSampleCount;
let elmDownload;

document.addEventListener('DOMContentLoaded', () => {

  document.getElementById("btnAnalysis").addEventListener("click", () => toggleAnalysis());
  elmSampleCount = document.getElementById("sampleCount");
  elmDownload = document.getElementById("downloadSample");
});

function toggleAnalysis() {

  const elmBtn = document.getElementById("btnAnalysis");

  // Turn off running analyzer
  if (soundAnalyzer) {
    elmBtn.innerText = "Turn on";
    let samples = soundAnalyzer.finish();
    createDownload(samples);
    soundAnalyzer = null;
    return;
  }

  // Start analyzer
  elmSampleCount.innerText = "starting";
  elmDownload.style.display = "none";
  const sa = new SoundAnalyzer();
  sa.start((ok) => {
    if (!ok) {
      elmSampleCount.innerText = "failed";
      return;
    }
    elmBtn.innerText = "Turn off";
    elmSampleCount.innerText = "...";
    soundAnalyzer = sa;
    setTimeout(updateProgress, 50);
  });
}

function updateProgress() {
  if (!soundAnalyzer) return;
  setTimeout(updateProgress, 50);
  elmSampleCount.innerText = "Samples: " + soundAnalyzer.samples.length;
}

function createDownload(samples) {

  let downloadText = "";
  for (const line of samples) {
    if (downloadText.length > 0) downloadText += "\n";
    downloadText += line;
  }

  const fileName = "samples.txt";
  const data = [downloadText];
  const properties = { type: "text/plain" };
  let file;
  try { file = new File(data, fileName, properties); }
  catch { file = new Blob(data, properties); }
  const url = URL.createObjectURL(file);

  elmDownload.href = url;
  elmDownload.download = fileName;
  elmDownload.style.display = "inline";
}
