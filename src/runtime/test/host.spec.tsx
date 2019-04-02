import { Component, Host, Prop, State, h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';


describe('hostData', () => {

  it('render hostData() attributes', async () => {
    @Component({ tag: 'cmp-a'})
    class CmpA {

      @Prop() hidden = false;

      hostData() {
        return {
          'role': 'alert',
          'aria-hidden': this.hidden ? 'true' : null,
          'hidden': this.hidden
        };
      }
    }
    // @ts-ignore
    const { root, flush } = await newSpecPage({
      components: [CmpA],
      html: `<cmp-a></cmp-a>`,
    });
    expect(root).toEqualHtml(`
      <cmp-a role="alert"></cmp-a>
    `);

    root.hidden = true;
    await flush();

    expect(root).toEqualHtml(`
      <cmp-a role="alert" aria-hidden="true" hidden></cmp-a>
    `);
  });

  it('render <host> attributes', async () => {
    @Component({ tag: 'cmp-a'})
    class CmpA {

      @Prop() hidden = false;

      render() {
        return (
          <Host
            role='alert'
            aria-hidden={this.hidden ? 'true' : null}
            hidden={this.hidden}
          />
        );
      }
    }
    // @ts-ignore
    const { root, flush } = await newSpecPage({
      components: [CmpA],
      html: `<cmp-a></cmp-a>`,
    });
    expect(root).toEqualHtml(`
      <cmp-a role="alert"></cmp-a>
    `);

    root.hidden = true;
    await flush();

    expect(root).toEqualHtml(`
      <cmp-a role="alert" aria-hidden="true" hidden></cmp-a>
    `);
  });

  it('register <host> listeners', async () => {
    @Component({ tag: 'cmp-a'})
    class CmpA {

      @State() count = 0;

      render() {
        return (
          <Host>
            <span>{this.count}</span>
            <cmp-b onClick={() => this.count++}>
            </cmp-b>
          </Host>
        );
      }
    }

    @Component({ tag: 'cmp-b'})
    class CmpB {

      @State() count = 0;

      render() {
        return (
          <Host
            onClick={() => this.count++}
          >
          {this.count}
          </Host>
        );
      }
    }
    // @ts-ignore
    const { doc, root, flush } = await newSpecPage({
      components: [CmpA, CmpB],
      html: `<cmp-a></cmp-a>`,
    });
    expect(root).toEqualHtml(`
      <cmp-a><span>0</span><cmp-b>0</cmp-b></cmp-a>
    `);

    (doc.querySelector('cmp-b') as any).click();
    await flush();

    expect(root).toEqualHtml(`
    <cmp-a><span>1</span><cmp-b>1</cmp-b></cmp-a>
    `);
  });

});
