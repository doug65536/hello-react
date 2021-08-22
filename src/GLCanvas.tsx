import React from 'react';
import { ResizableChild } from './ToolWindow';
import { Mat4x4 } from './Mat4x4';

type NameMap<T> = { [name: string]: T };
type StringMap = NameMap<string>;
type ImageMap = NameMap<HTMLImageElement>;

const earthRadius = 6371009;
const earthOrbit = 1.4959802296e+11;
const sunRadius = 695700000;
const moonRadius = 1737400;
const moonOrbit = 385000000;

class SolSystem {
  private largeBodies = {
    sun: {
      radius: sunRadius,
      orbit: 0,
      parent: ''
    },
    earth: {
      radius: earthRadius,
      orbit: earthOrbit,
      parent: 'sun',
      year: 1,
    },
    luna: {
      radius: moonRadius,
      orbit: moonOrbit,
      parent: 'earth'
    }
  };
}

export class GLCanvas extends React.Component<{}>
    implements ResizableChild {
  private shaderSourceFiles: Promise<StringMap> = this.fetchShaderFiles({
    vertexShader: 'test.vsh',
    fragmentShader: 'test.frag'
  });
  private imageFiles: Promise<ImageMap> = this.fetchImageFiles({
    earth: 'earthmap1k.png',
    space: 'milkyway.png',
    moon: 'moonmap.jpg',
    sun: '2k_sun.jpg'
  });
  private sizeChanged: boolean = false;
  private statusText: string = 'Initializing component';

  shouldComponentUpdate(): boolean {
    return false;
  }

  resize(width: number, height: number): void {
    if (!this.element)
      return;
    this.element.width = width;
    this.element.height = height;
    if (this.gl)
      this.gl.viewport(0, 0, width, height);
    this.sizeChanged = true;
  }

  clampWithin(left: number, top: number,
    right: number, bottom: number): boolean {
    return true;
  }

  private element: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;

  render(): JSX.Element {
    return <canvas
      ref={(el) => this.initComponent(el)} />;
  }

  static spherePoint(dest: Float32Array, row: number,
    lat: number, lon: number, radius: number): void {
    const DEG2RAD = Math.PI / 180;
    let theta: number = lat * DEG2RAD;
    let phi = lon * DEG2RAD;
    let sintheta = Math.sin(theta);
    let costheta = Math.cos(theta);
    let sinphi = Math.sin(phi);
    let cosphi = Math.cos(phi);

    let norx = costheta * sinphi;
    let nory = sintheta;
    let norz = costheta * cosphi;

    let posx = norx * radius;
    let posy = nory * radius;
    let posz = norz * radius;

    // pos3,nor3,tex2 = 8 floats per vertex
    let place = row * 8;
    dest[place + 0] = posx;
    dest[place + 1] = posy;
    dest[place + 2] = posz;
    dest[place + 3] = norx;
    dest[place + 4] = nory;
    dest[place + 5] = norz;
    dest[place + 6] = (lon + 180) / 360;
    dest[place + 7] = (-lat + 90) / 180;
  }

  private initComponent(el: HTMLCanvasElement | null): void {
    this.element = el;
    this.gl = null;
    this.statusText = 'Initializing WebGL';

    if (el) {
      this.gl = el.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: true,
        desynchronized: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        stencil: false
      });

      if (!this.gl) {

        return;
      }

      requestAnimationFrame(() => {
        this.waitForResources();
      });
    } else {
      this.gl = null;
    }
  }

  private waitForResources() {
    Promise.all([this.shaderSourceFiles, this.imageFiles])
    .then((responses: [StringMap, ImageMap]) => {
      let strings = responses[0];
      let images = responses[1];
      if (this.gl)
        this.initGL(strings, images);
    });
  }

  downloadImageFile(path: string, 
      progress?: (done: number, total: number) => void)
      : Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      let image: HTMLImageElement | null = new Image();
      image.style.position = 'fixed';
      image.style.top = '0';
      image.style.left = '0';
      image.style.transform = 'translate(0%, -100%)';
      image.addEventListener('load', (event) => {
        if (image) {
          document.body.removeChild(image);
          resolve(image);
        } else {
          reject(new Error('Got load event with null image somehow'));
        }
      });
      image.addEventListener('progress', (event) => {
        if (progress)
          progress(event.loaded, event.total);
      });
      image.addEventListener('error', (event) => {
        if (image) {
          document.body.removeChild(image);
          image = null;
        }
        reject(new Error(event.filename + 
            ':' + event.lineno + 
            ':' + event.colno +
            ': Texture download failed: ' + 
            event.message));
      });
      image.src = path;
      document.body.appendChild(image);
    });
  }

  unzip<T>(input: NameMap<T>): [string[], T[]] {
    return [Object.keys(input), Object.values(input)];
  }

  zip<T>(keys: string[], values: T[]): NameMap<T> {
    return values.reduce((result: NameMap<T>, value, index) => {
      let key = keys[index];
      result[key] = value;
      return result;
    }, {});
  }

  fetchShaderFiles(list: StringMap): Promise<StringMap> {
    let [ keys, values ] = this.unzip(list);
    return this.downloadTextFiles(values).then((files: string[]) => {
      return this.zip(keys, files);
    });
  }

  fetchImageFiles(list: StringMap): Promise<ImageMap> {
    let [ keys, values ] = this.unzip(list);
    return this.downloadImageFiles(values)
    .then((images: HTMLImageElement[]) => {
      return this.zip(keys, images);
    });
  }

  downloadImageFiles(paths: string[],
      progress?: (index: number, done: number, total: number) => void)
      : Promise<HTMLImageElement[]> {
    let downloads = paths.map((path, index) => {
      return this.downloadImageFile(path, (done: number, total: number) => {
        if (progress)
          progress(index, done, total);
      });
    });

    return Promise.all(downloads);
  }

  downloadTextFiles(paths: string[],
      progress?: (index: number, done: number, total: number) => void)
      : Promise<string[]> {
    let fetches = paths.map((path) => {
      return fetch(path);
    });

    let responses = Promise.all(fetches);

    return responses.then((responses: Response[]) => {
      return Promise.all(responses.map((response, index) => {
        return response.text().then((text) => {
          if (progress)
            progress(index, text.length, text.length);
          return text;
        });
      }));
    });
  }

  viewMatrix(cx: number, cy: number, cz: number): number[] {
    return [
      1, 0, 0, -cx,
      0, 1, 0, -cy,
      0, 0, 1, -cz,
      0, 0, 0, 1,
    ];
  }

  toEarthRadii(m: number): number {
    return m / 6371009;
  }

  initGL(sources: StringMap, images: ImageMap) {
    if (!this.gl)
      return;

    let sphere: Float32Array;

    let row = 0;

    let actualSphere = true;
    if (actualSphere) {
      let latstep = 2;
      let lonstep = 2;

      console.assert(360 % lonstep === 0);
      console.assert(180 % latstep === 0);

      let points = 2 * (360 * 180) / (latstep * lonstep) + 1;

      sphere = new Float32Array(points * 8);

      let radius = 1;

      // For each column of points
      for (let lon = -180; lon < 180; lon += lonstep) {
        GLCanvas.spherePoint(sphere, row++,
          -90, 0, radius);

        // 180 points
        for (let lat = -90; lat < 90; lat += latstep) {
          GLCanvas.spherePoint(sphere, row++,
            lat, lon + lonstep, radius);

          GLCanvas.spherePoint(sphere, row++,
            lat, lon, radius);
        }

        lon += lonstep;

        GLCanvas.spherePoint(sphere, row++,
          90, 0, radius);

        for (let lat = 90 - latstep; lat > -90; lat -= latstep) {
          GLCanvas.spherePoint(sphere, row++,
            lat, lon + lonstep, radius);

          GLCanvas.spherePoint(sphere, row++,
            lat, lon, radius);
        }
      }

      GLCanvas.spherePoint(sphere, row++,
        0, -90, radius);

      console.assert(row === points);

      console.log('used ', row, 'rows');
    } else {
      sphere = new Float32Array(8 * 3);
      sphere[8 * row + 0] = 1;
      sphere[8 * row + 1] = 1;
      sphere[8 * row + 2] = 0;
      ++row;
      sphere[8 * row + 0] = -1;
      sphere[8 * row + 1] = -1;
      sphere[8 * row + 2] = 0;
      ++row;
      sphere[8 * row + 0] = 1;
      sphere[8 * row + 1] = -1;
      sphere[8 * row + 2] = 0;
      ++row;
    }

    let vertexArray = this.gl.createVertexArray();
    this.gl.bindVertexArray(vertexArray);

    let vertexBuffer = this.gl.createBuffer();

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);

    this.gl.bufferData(this.gl.ARRAY_BUFFER, sphere,
      this.gl.STATIC_DRAW);

    let program = this.gl.createProgram();

    if (!program)
      return;

    let vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    let fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

    if (!vertexShader)
      return;
    if (!fragmentShader)
      return;

    this.gl.shaderSource(vertexShader, sources.vertexShader);
    this.gl.shaderSource(fragmentShader, sources.fragmentShader);
    this.gl.compileShader(vertexShader);
    this.gl.compileShader(fragmentShader);
    let vertexCompileResult = this.gl.getShaderInfoLog(vertexShader);
    if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS))
      console.log('vertex shader compile failed');
    let fragmentCompileResult = this.gl.getShaderInfoLog(fragmentShader);
    if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS))
      console.log('fragment shader compile failed');

    if (vertexCompileResult) {
      console.log('vertex shader compile -----------------');
      console.log(vertexCompileResult);
    }
    if (fragmentCompileResult) {
      console.log('fragment shader compile -----------------');
      console.log(fragmentCompileResult);
    }

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);

    this.gl.linkProgram(program);
    this.gl.validateProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS))
      console.log('GLSL link failed');
    let linkResult = this.gl.getProgramInfoLog(program);
    if (linkResult) {
      console.log('shader link -----------------');
      console.log(linkResult);
    } else {
      console.log('shader linked cleanly');
    }

    let pm = this.gl.getUniformLocation(program, 'pm');
    let vm = this.gl.getUniformLocation(program, 'vm');
    let oc = this.gl.getUniformLocation(program, 'object_color');
    let t0 = this.gl.getUniformLocation(program, 'tex0');
    let sc = this.gl.getUniformLocation(program, 'scale');
    let cs = this.gl.getUniformLocation(program, 'color_scale');
    let sd = this.gl.getUniformLocation(program, 'sundir');

    let vc = this.gl.getAttribLocation(program, 'vc');
    let nv = this.gl.getAttribLocation(program, 'nv');
    let tc = this.gl.getAttribLocation(program, 'tc');

    if (vc >= 0) {
      this.gl.vertexAttribPointer(vc, 3, this.gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 0);
      this.gl.enableVertexAttribArray(vc);
    }

    if (nv >= 0) {
      this.gl.vertexAttribPointer(nv, 3, this.gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT,
        3 * Float32Array.BYTES_PER_ELEMENT);
      this.gl.enableVertexAttribArray(nv);
    }

    if (tc >= 0) {
      this.gl.vertexAttribPointer(tc, 2, this.gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT,
        6 * Float32Array.BYTES_PER_ELEMENT);
      this.gl.enableVertexAttribArray(tc);
    }

    let textures: NameMap<WebGLTexture>;

    //
    // Upload textures
    let [ textureNames, textureImages ] = this.unzip(images);
    textures = textureImages.reduce((textures: NameMap<WebGLTexture>, 
        textureImage: HTMLImageElement, index: number) => {
      if (!this.gl)
        return textures;
      
      let name = textureNames[index];

      let texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,
        textureImage.width, textureImage.height, 0,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureImage);
  
      this.gl.generateMipmap(this.gl.TEXTURE_2D);

      if (texture)
        textures[name] = texture;

      return textures;
    }, {});

    let viewMatrixData = new Float32Array(this.viewMatrix(0, 0, 2.2));

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    //
    // Matrices
    let vs = this.gl.canvas.height / this.gl.canvas.width;
    let projMatrixData = new Float32Array(16);
    Mat4x4.proj(projMatrixData, -1, vs, 1, -vs, 1, 65536);

    // let viewMatrixData = new Float32Array(16);
    // let projMatrixData = new Float32Array(16);
    // this.identityMatrix(viewMatrixData);
    // this.identityMatrix(projMatrixData);
    console.assert(projMatrixData.length === 16);
    console.assert(viewMatrixData.length === 16);

    this.gl.useProgram(program);
    //this.gl.uniformMatrix4fv(vm, true, viewMatrixData);
    this.gl.uniformMatrix4fv(pm, true, projMatrixData);

    if (oc)
      this.gl.uniform4f(oc, 1, 1, 1, 1);

    if (t0)
      this.gl.uniform1i(t0, 0);

    if (sc)
      this.gl.uniform1f(sc, 1);
    
    if (cs)
      this.gl.uniform1f(cs, 1);

    //this.gl.useProgram(null);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);

    this.gl.viewport(0, 0, this.element!.width, this.element!.height);

    let mtx: Mat4x4 = new Mat4x4();

    mtx.translate(0, 0, -3);

    let since = performance.now();
    let frame = () => {
      if (!this.gl)
        return;

      this.gl.useProgram(program);

      if (this.sizeChanged && this.element) {
        this.sizeChanged = false;

        let vs = this.element.height / this.element.width;
        Mat4x4.proj(projMatrixData, -1, vs, 1, -vs, 1, 65536);
        this.gl.uniformMatrix4fv(pm, true, projMatrixData);
      }

      this.gl.clearColor(1 / 255, 2 / 255, 3 / 255, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      let now = performance.now();
      let elap = now - since;
      //since = now;

      if (sd) {
        // normalize 1 0 0.45
        let ldx = 1;
        let ldy = 0;
        let ldz = 0.6;
        let ldl = Math.sqrt(ldx * ldx + ldy * ldy + ldz * ldz);
        let lil = 1 / ldl;
        ldx *= lil;
        ldy *= lil;
        ldz *= lil;
        this.gl.uniform3f(sd, ldx, ldy, ldz);
      }

      //
      // Earth

      this.gl.bindTexture(this.gl.TEXTURE_2D, textures.earth);
      if (sc)
        this.gl.uniform1f(sc, 1);
      if (cs)
        this.gl.uniform1f(cs, 1);
      let angle = ((elap % 53000) / 53000) * Math.PI * 2 - Math.PI;
      mtx.push();
      mtx.rotateZ(-23.44 * Math.PI / 180);
      mtx.rotateY(angle);
      this.gl.uniformMatrix4fv(vm, true, mtx.get());
      mtx.pop();
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, row);

      //
      // Space

      this.gl.bindTexture(this.gl.TEXTURE_2D, textures.space);
      if (sc)
        this.gl.uniform1f(sc, -65536);
      if (cs)
        this.gl.uniform1f(cs, 1);
      angle = 0.25 * Math.PI * 2 - Math.PI;
      Mat4x4.rotateY(mtx.push_uninitialized(), angle);
      this.gl.uniformMatrix4fv(vm, true, mtx.get());
      mtx.pop();
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, row);

      //
      // Moon

      this.gl.bindTexture(this.gl.TEXTURE_2D, textures.moon);
      if (sc)
        this.gl.uniform1f(sc, moonRadius / earthRadius);
      if (cs)
        this.gl.uniform1f(cs, 1);
      mtx.push();
      angle = ((elap % 7460) / 7460) * Math.PI * 2 - Math.PI;
      mtx.rotateY(angle);
      mtx.translate(0, 0, moonOrbit / earthRadius);
      this.gl.uniformMatrix4fv(vm, true, mtx.get());
      mtx.pop();
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, row);

      this.gl.bindTexture(this.gl.TEXTURE_2D, textures.sun);
      if (sc)
        this.gl.uniform1f(sc, moonRadius / earthRadius);
      if (cs)
        this.gl.uniform1f(cs, 1);
      mtx.push();
      angle = ((elap % 7460) / 7460) * Math.PI * 2 - Math.PI;
      mtx.rotateY(angle);
      mtx.translate(0, 0, moonOrbit / earthRadius);
      this.gl.uniformMatrix4fv(vm, true, mtx.get());
      mtx.pop();
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, row);

      this.gl.bindTexture(this.gl.TEXTURE_2D, textures.sun);
      if (sc)
        this.gl.uniform1f(sc, sunRadius / earthRadius);
      if (cs)
        this.gl.uniform1f(cs, 8);
      mtx.push();
      angle = ((elap % 7460) / 7460) * Math.PI * 2 - Math.PI;
      mtx.rotateY(angle + Math.PI);
      mtx.translate(0, 0, earthOrbit / earthRadius);
      this.gl.uniformMatrix4fv(vm, true, mtx.get());
      mtx.pop();
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, row);

      requestAnimationFrame(frame);
    };

    frame();
  }
}
