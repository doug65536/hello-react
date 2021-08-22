uniform mat4 pm;
uniform mat4 vm;
uniform float scale;

attribute vec3 vc;
attribute vec3 nv;
attribute vec2 tc;

varying vec3 normal_dir;
varying float f_lf;
varying vec2 f_tc;

void main(void)
{
    // viewspace position
    vec4 vp = vm * vec4(vc * scale, 1.0);// * vec4(scale,scale,scale,1);

    // clipspace position
    gl_Position = pm * vp;
    
    // normal matrix
    mat3 nm = mat3(vm);

    // Transform the normal
    normal_dir = nm * nv;
   
    // It is land if the vector is not null
    f_lf = nv.x != 0.0 || nv.y != 0.0 ? 1.0 : 0.0;
    
    // Pass through texcoord
    f_tc = tc;
}
