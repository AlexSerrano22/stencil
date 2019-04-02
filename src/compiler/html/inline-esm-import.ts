import * as d from '../../declarations';


export async function inlineEsmImport(doc: Document, config: d.Config, compilerCtx: d.CompilerCtx, outputTarget: d.OutputTargetWww) {
  const expectedSrc = `/build/${config.fsNamespace}.mjs.js`;
  const script = Array.from(doc.querySelectorAll('script'))
    .find(s => s.getAttribute('type') === 'module' && s.getAttribute('src') === expectedSrc);

  if (!script) {
    return;
  }

  let content = await compilerCtx.fs.readFile(config.sys.path.join(outputTarget.dir, expectedSrc));
  const result = content.match(/import.*from\s*(?:'|")(.*)(?:'|");/);
  if (!result) {
    return;
  }
  const corePath = result[1];
  const newPath = config.sys.path.join(
    config.sys.path.dirname(expectedSrc),
    corePath
  );
  content = content.replace(corePath, newPath);

  // insert inline script
  const inlinedScript = doc.createElement('script');
  inlinedScript.setAttribute('type', 'module');
  inlinedScript.innerHTML = content;
  script.parentNode.insertBefore(
    inlinedScript,
    script
  );

  // remove original script
  script.remove();
}
