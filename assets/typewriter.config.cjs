module.exports = {
  multipass: true, // boolean. false by default
  js2svg: {
    indent: 2, // string with spaces or number of spaces. 4 by default
    pretty: true, // boolean, false by default
  },
  plugins: [
    'removeDimensions',
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIDs: {
            preserve: [ 'roller', 'hammer', 'paper', 'stub', 'machine-body' ],
            preservePrefixes: [ 'key-' ],
          },
          removeXMLProcInst: false,
        },
      },
    },
  ],
};
