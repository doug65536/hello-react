uniform highp vec4 object_color;
uniform highp sampler2D tex0;
uniform highp float scale;
uniform highp float color_scale;
varying highp vec3 normal_dir;
varying highp float f_lf;
varying highp vec2 f_tc;
uniform highp vec3 sundir;

void main()
{
    highp vec3 texel = texture2D(tex0, f_tc).rgb;
    highp float shade;
    if (scale > 0.0) {
        shade = dot(sundir, normal_dir);
    } else {
        shade = 1.0;
    }
    highp vec4 color = vec4(texel * shade, 1.0) * color_scale;
    gl_FragColor = color;
}
