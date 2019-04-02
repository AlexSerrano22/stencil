import * as d from '../../declarations';
import { buildWarn, catchError, hasError, unique } from '@utils';
import { isOutputTargetWww } from '../output-targets/output-utils';


export async function generateServiceWorkers(config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx) {
  const wwwServiceOutputs = await getServiceWorkerOutputs(config, compilerCtx, buildCtx);

  if (wwwServiceOutputs.length === 0) {
    // no output targets require service workers
    return;
  }

  // let's make sure they have what we need from workbox installed
  await config.sys.lazyRequire.ensure(config.logger, config.rootDir, [WORKBOX_BUILD_MODULE_ID]);

  // we've ensure workbox is installed, so let's require it now
  const workbox: d.Workbox = config.sys.lazyRequire.require(WORKBOX_BUILD_MODULE_ID);

  await Promise.all(
    wwwServiceOutputs.map(outputTarget => (
      generateServiceWorker(config, buildCtx, outputTarget, workbox)
    ))
  );
}


async function generateServiceWorker(config: d.Config, buildCtx: d.BuildCtx, outputTarget: d.OutputTargetWww, workbox: d.Workbox) {
  ignoreLegacyBundles(config, outputTarget.serviceWorker);

  if (hasSrcConfig(outputTarget)) {
    await Promise.all([
      copyLib(buildCtx, outputTarget, workbox),
      injectManifest(buildCtx, outputTarget, workbox)
    ]);

  } else {
    await generateSW(buildCtx, outputTarget.serviceWorker, workbox);
  }
}


async function copyLib(buildCtx: d.BuildCtx, outputTarget: d.OutputTargetWww, workbox: d.Workbox) {
  const timeSpan = buildCtx.createTimeSpan(`copy service worker library started`, true);

  try {
    await workbox.copyWorkboxLibraries(outputTarget.dir);

  } catch (e) {
    // workaround for workbox issue in the latest alpha
    const d = buildWarn(buildCtx.diagnostics);
    d.messageText = 'Service worker library already exists';
  }

  timeSpan.finish(`copy service worker library finished`);
}


async function generateSW(buildCtx: d.BuildCtx, serviceWorker: d.ServiceWorkerConfig, workbox: d.Workbox) {
  const timeSpan = buildCtx.createTimeSpan(`generate service worker started`);

  try {
    await workbox.generateSW(serviceWorker);
    timeSpan.finish(`generate service worker finished`);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }
}


async function injectManifest(buildCtx: d.BuildCtx, outputTarget: d.OutputTargetWww, workbox: d.Workbox) {
  const timeSpan = buildCtx.createTimeSpan(`inject manifest into service worker started`);

  try {
    await workbox.injectManifest(outputTarget.serviceWorker);
    timeSpan.finish('inject manifest into service worker finished');

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }
}


function ignoreLegacyBundles(config: d.Config, serviceWorker: d.ServiceWorkerConfig) {
  if (typeof serviceWorker.globIgnores === 'string') {
    serviceWorker.globIgnores = [serviceWorker.globIgnores];
  }

  serviceWorker.globIgnores = serviceWorker.globIgnores || [];

  serviceWorker.globIgnores.push(
    `**/${config.fsNamespace}/*.system.entry.js`,
    `**/${config.fsNamespace}/*.system.js`,
  );

  serviceWorker.globIgnores = unique(serviceWorker.globIgnores);
}


function hasSrcConfig(outputTarget: d.OutputTargetWww) {
  return !!outputTarget.serviceWorker.swSrc;
}


async function getServiceWorkerOutputs(config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx) {
  const outputTargets = (config.outputTargets as d.OutputTargetWww[]).filter(o => o.type === 'www' && o.serviceWorker);

  const wwwServiceOutputs: d.OutputTargetWww[] = [];

  for (let i = 0; i < outputTargets.length; i++) {
    const shouldSkipSW = await canSkipGenerateSW(config, compilerCtx, buildCtx, outputTargets[i]);
    if (!shouldSkipSW) {
      wwwServiceOutputs.push(outputTargets[i]);
    }
  }

  return wwwServiceOutputs;
}


async function canSkipGenerateSW(config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, outputTarget: d.OutputTargetWww) {
  if (!outputTarget.serviceWorker) {
    return true;
  }

  if (!config.srcIndexHtml) {
    return true;
  }

  const hasServiceWorkerChanged = hasServiceWorkerChanges(config, buildCtx);
  if ((compilerCtx.hasSuccessfulBuild && buildCtx.appFileBuildCount === 0 && !hasServiceWorkerChanged) || hasError(buildCtx.diagnostics)) {
    // no need to rebuild index.html if there were no app file changes
    return true;
  }

  const hasSrcIndexHtml = await compilerCtx.fs.access(config.srcIndexHtml);
  if (!hasSrcIndexHtml) {
    buildCtx.debug(`generateServiceWorker, no index.html, so skipping sw build`);
    return true;
  }

  // let's build us some service workerz
  return false;
}


export function hasServiceWorkerChanges(config: d.Config, buildCtx: d.BuildCtx) {
  if (config.devMode && !config.flags.serviceWorker) {
    return false;
  }

  const wwwServiceOutputs = config.outputTargets
    .filter(isOutputTargetWww)
    .filter(o => o.serviceWorker && o.serviceWorker.swSrc);

  return wwwServiceOutputs.some(outputTarget => {
    return buildCtx.filesChanged.some(fileChanged => config.sys.path.basename(fileChanged).toLowerCase() === config.sys.path.basename(outputTarget.serviceWorker.swSrc).toLowerCase());
  });
}

export function getRegisterSW(swUrl: string) {
  return `
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('${swUrl}')
      .then(function(reg) {
        reg.onupdatefound = function() {
          var installingWorker = reg.installing;
          installingWorker.onstatechange = function() {
            if (installingWorker.state === 'installed') {
              window.dispatchEvent(new Event('swUpdate'))
            }
          }
        }
      })
      .catch(function(err) { console.error('service worker error', err) });
  });
}`;
}

export const UNREGISTER_SW = `
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // auto-unregister service worker during dev mode
  navigator.serviceWorker.getRegistration().then(function(registration) {
    if (registration) {
      registration.unregister().then(function() { location.reload(true) });
    }
  });
}
`;

const WORKBOX_BUILD_MODULE_ID = 'workbox-build';
