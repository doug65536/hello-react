import React from 'react';
import { ResizableChild } from './ToolWindow';

export type NameMap<T> = { [name: string]: T };
export type StringMap = NameMap<string>;
export type ImageMap = NameMap<HTMLImageElement>;

export abstract class GLCanvas extends React.Component<{}>
    implements ResizableChild {
  abstract shaderSourceFiles: Promise<StringMap>;
  abstract imageFiles: Promise<ImageMap>;
  protected sizeChanged: boolean = false;
  
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

  protected element: HTMLCanvasElement | null = null;
  protected gl: WebGL2RenderingContext | null = null;

  render(): JSX.Element {
    return <canvas
      ref={(el) => this.initComponent(el)} />;
  }

  private initComponent(el: HTMLCanvasElement | null): void {
    this.element = el;
    this.gl = null;

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
        this.waitForResourcesThenInit();
      });
    } else {
      this.gl = null;
    }
  }

  private waitForResourcesThenInit() {
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

  uploadTextures(textureNames: string[], 
    textureImages: HTMLImageElement[]): NameMap<WebGLTexture> {
    return textureImages.reduce((textures: NameMap<WebGLTexture>, 
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
    }
        
  abstract initGL(sources: StringMap, images: ImageMap) : void;
}

