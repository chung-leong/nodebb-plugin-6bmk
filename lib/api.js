'use strict';

const meta = require.main.require('./src/meta');
const controllerHelpers = require.main.require('./src/controllers/helpers');
const {
	addFlyer,
	getFlyers,
	formatFlyer,
  formatFlyers,
	getFlyerStream,
	findHaiku,
} = require('./helpers');

module.exports = {
  validateHaiku,
  retrieveFlyers,
  retrieveFlyer,
  createFlyer,
  downloadFlyer,
};

async function validateHaiku(req, res, next) {
  try {
    const { text } = req.body;
    const haiku = await findHaiku(text);
    if (haiku) {
      req.session.validatedHaikuId = haiku.hid;
    }
    const uedHaiku = !haiku ? await findHaiku(text, false) : null;
    controllerHelpers.formatApiResponse(200, res, { 
      found: !!haiku, 
      used: !!uedHaiku, 
    });  
  } catch (err) {
    console.error(err);
    next(err);
  }
}

async function retrieveFlyers(req, res, next) {
  try {
    const flyers = await getFlyers();	
    controllerHelpers.formatApiResponse(200, res, { 
      flyers: await formatFlyers(flyers),
    });	
  } catch (err) {
    next(err);
  }
}

async function retrieveFlyer(req, res, next) {
  try {
    const { id } = req.params;
    const flyer = await getFlyer(id);
    controllerHelpers.formatApiResponse(200, res, { 
      flyer: await formatFlyer(flyer)
    });
  } catch (err) {
    next(err);
  }
}

async function createFlyer(req, res, next) {
  try {
    const { download } = req.body;
    const { paper, orientation, mode, locale, instructions } = await meta.settings.get('6bmk');
    const flyer = await addFlyer({ paper, orientation, mode, locale, instructions });
    if (download === 'pptx') {
      res.redirect(req.originalUrl + `${flyer.fid}/pptx`);
    } else {
      controllerHelpers.formatApiResponse(200, res, { 
        flyer: await formatFlyer(flyer)
      });	
    }	
  } catch (err) {
    console.error(err);
    next(err);
  }
}

async function downloadFlyer(req, res, next) {
  try {
    const { id } = req.params;
    const stream = await getFlyerStream(id);
    const name = `flyer-${id}`;
    res.set({ 
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${name}.pptx"`,
    });
    stream.pipe(res);	
  } catch (err) {
    next(err);
  }
}
