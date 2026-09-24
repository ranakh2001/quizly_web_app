// ESLint's core no-unused-vars doesn't know that <Foo /> "uses" the imported Foo
// identifier. This tiny local rule marks JSX tag names as used, the same technique
// ESLint's own docs recommend, so we don't need to pull in all of eslint-plugin-react
// just for this one check.
export default {
  rules: {
    'jsx-uses-vars': {
      meta: { type: 'problem' },
      create(context) {
        return {
          JSXOpeningElement(node) {
            let target = node.name;
            while (target.type === 'JSXMemberExpression') target = target.object;
            if (target.type === 'JSXIdentifier') {
              context.sourceCode.markVariableAsUsed(target.name, node);
            }
          },
        };
      },
    },
  },
};
