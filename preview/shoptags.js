// Shopify block tags for partials loaded natively by {% render %}
// (top-level section/block files are handled by preprocess instead).
function dropTag(engine, name) {
  engine.registerTag(name, {
    parse(tagToken, remainTokens) {
      this.tpls = [];
      while (remainTokens.length) {
        const token = remainTokens.shift();
        if (token.name === 'end' + name) return;
        this.tpls.push(token);
      }
      throw new Error('unclosed ' + name);
    },
    render() { return Promise.resolve(''); }
  });
}
function styleTag(engine, name) {
  engine.registerTag(name, {
    parse(tagToken, remainTokens) {
      this.tpls = [];
      while (remainTokens.length) {
        const token = remainTokens.shift();
        if (token.name === 'end' + name) return;
        this.tpls.push(token);
      }
      throw new Error('unclosed ' + name);
    },
    render(ctx) {
      const liquid = this.liquid;
      const src = this.tpls.map((tok) => (tok.getText ? tok.getText() : '')).join('');
      return this.liquid.parseAndRender(src, ctx).then((css) => '<style>' + css + '</style>');
    }
  });
}
function wrapTag(engine, name, before, after) {
  engine.registerTag(name, {
    parse(tagToken, remainTokens) {
      this.tpls = [];
      while (remainTokens.length) {
        const token = remainTokens.shift();
        if (token.name === 'end' + name) return;
        this.tpls.push(token);
      }
      throw new Error('unclosed ' + name);
    },
    render(ctx) {
      const src = this.tpls.map((tok) => (tok.getText ? tok.getText() : '')).join('');
      return this.liquid.parseAndRender(src, ctx).then((inner) => before + inner + after);
    }
  });
}
module.exports = { dropTag, styleTag, wrapTag };
