export const mathjax2TexScript = `
<article>
  <p>Inline <script type="math/tex">E=mc^2</script> and display:</p>
  <script type="math/tex; mode=display">\\int_0^1 x\\,dx</script>
</article>
`;

export const mathjax2Rendered = `
<article>
  <span class="MathJax" id="MathJax-Element-1-Frame"></span>
  <script type="math/tex" id="MathJax-Element-1">a^2+b^2=c^2</script>
  <div class="MathJax_Display">
    <span class="MathJax"></span>
  </div>
  <script type="math/tex; mode=display">\\sum_{n=1}^{\\infty} \\frac{1}{n^2}</script>
</article>
`;

export const mathjax3Mjx = `
<article>
  <mjx-container class="MathJax" jax="CHTML" display="true" data-tex="\\frac{1}{2}">
    <mjx-assistive-mml>
      <math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>
    </mjx-assistive-mml>
  </mjx-container>
  <mjx-container class="MathJax" jax="CHTML" data-tex="x+y">
    <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>+</mo><mi>y</mi></math>
  </mjx-container>
</article>
`;

export const katex = `
<article>
  <span class="katex">
    <span class="katex-mathml">
      <math xmlns="http://www.w3.org/1998/Math/MathML">
        <semantics>
          <mrow><mi>x</mi></mrow>
          <annotation encoding="application/x-tex">x</annotation>
        </semantics>
      </math>
    </span>
  </span>
  <div class="katex-display">
    <span class="katex">
      <span class="katex-mathml">
        <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
          <semantics>
            <mrow><mi>y</mi></mrow>
            <annotation encoding="application/x-tex">y = mx + b</annotation>
          </semantics>
        </math>
      </span>
    </span>
  </div>
</article>
`;

export const wikipediaMwe = `
<article>
  <img class="mwe-math-fallback-image-inline" alt="a^{2}+b^{2}=c^{2}" src="https://example.com/math.png">
  <img class="mwe-math-fallback-image-display" alt="\\int f(x)\\,dx" src="https://example.com/math2.png">
</article>
`;

export const mathmlRaw = `
<article>
  <p>Inline <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>z</mi></math> here.</p>
  <math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mi>Q</mi></math>
</article>
`;

export const mixedArticle = `
<article>
  <p>MJ2 <script type="math/tex">1+1</script></p>
  <span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mi>k</mi></mrow><annotation encoding="application/x-tex">k</annotation></semantics></math></span></span>
  <img class="mwe-math-fallback-image-inline" alt="n!" src="https://example.com/n.png">
</article>
`;

export const noMath = `
<article>
  <p>Just a normal paragraph with no formulas.</p>
  <p>Numbers like 2+2 are not math markup.</p>
</article>
`;

export const sharePayload = `
<div class="simple-container">
  <div class="content-container">
    <p>Energy <span class="jr-math" data-jr-display="inline" data-jr-tex="E=mc^2">E=mc^2</span> matters.</p>
    <span class="jr-math" data-jr-display="block" data-jr-tex="\\int_0^1 x dx">\\int_0^1 x dx</span>
  </div>
</div>
`;
