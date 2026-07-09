export const holographicGlobeVertexShader = `
  varying vec3 vObjectPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vObjectPosition = normalize(position);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = worldPosition.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const holographicGlobeFragmentShader = `
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uGridColor;
  uniform sampler2D uEarthMap;
  uniform sampler2D uCityMap;
  varying vec3 vObjectPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  const float PI = 3.141592653589793;

  float gridLine(float coordinate, float frequency, float width) {
    float cell = abs(fract(coordinate * frequency) - 0.5);
    return 1.0 - smoothstep(width, width + 0.025, cell);
  }

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 345.45));
    point += dot(point, point + 34.345);
    return fract(point.x * point.y);
  }

  void main() {
    vec3 sphere = normalize(vObjectPosition);
    vec3 earth = texture2D(uEarthMap, vUv).rgb;
    vec3 city = texture2D(uCityMap, vUv).rgb;
    float landSignal = (earth.r + earth.g) * 0.5 - earth.b * 0.58;
    float land = smoothstep(0.012, 0.105, landSignal);
    float coast = 1.0 - smoothstep(0.0, 0.22, abs(land - 0.5));
    float cityLight = smoothstep(0.18, 0.72, max(city.r, max(city.g, city.b))) * land;
    float latitude = asin(clamp(sphere.y, -1.0, 1.0)) / PI + 0.5;
    float longitude = atan(sphere.z, sphere.x) / (2.0 * PI) + 0.5;
    float polarFade = smoothstep(0.04, 0.22, 1.0 - abs(sphere.y));

    float latitudeGrid = gridLine(latitude, 18.0, 0.012);
    float longitudeGrid = gridLine(longitude, 36.0, 0.010) * polarFade;
    float majorLatitude = gridLine(latitude, 6.0, 0.014);
    float majorLongitude = gridLine(longitude, 12.0, 0.012) * polarFade;
    float grid = max(max(latitudeGrid, longitudeGrid) * 0.34, max(majorLatitude, majorLongitude) * 0.72);

    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = max(dot(normalize(vWorldNormal), viewDirection), 0.0);
    float fresnel = pow(1.0 - facing, 3.2);

    float scanPosition = fract((sphere.y * 0.5 + 0.5) - uTime * 0.035);
    float scanBand = 1.0 - smoothstep(0.0, 0.038, abs(scanPosition - 0.5));
    float microScan = 0.5 + 0.5 * sin((sphere.y * 240.0) - uTime * 1.4);
    float microGrid = hash21(floor(vec2(longitude * 280.0, latitude * 140.0)));
    float dataNoise = smoothstep(0.91, 0.995, microGrid) * (0.25 + 0.75 * microScan);

    vec3 oceanColor = vec3(0.005, 0.018, 0.04);
    vec3 landColor = vec3(0.055, 0.38, 0.68);
    vec3 color = mix(oceanColor, landColor, land) * (0.56 + facing * 0.34);
    color += uGridColor * grid * (0.07 + land * 0.12);
    color += uGridColor * coast * 0.34;
    color += uGridColor * scanBand * land * 0.055;
    color += uGridColor * fresnel * 0.72;
    color += vec3(0.22, 0.72, 1.0) * cityLight * 0.42;
    color += uGridColor * dataNoise * land * 0.08;

    float alpha = 0.62 + land * 0.2 + coast * 0.08 + fresnel * 0.12;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.92));
  }
`;

export const atmosphereVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const atmosphereFragmentShader = `
  uniform vec3 uAtmosphereColor;
  uniform float uIntensity;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 2.35);
    float outerHaze = pow(rim, 1.55);
    vec3 color = uAtmosphereColor * (rim * 0.72 + outerHaze * 0.42);
    gl_FragColor = vec4(color, outerHaze * uIntensity);
  }
`;

export const cityVertexShader = `
  varying float vFacing;

  void main() {
    vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
    vec4 worldPosition = modelMatrix * instancePosition;
    vec3 worldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vec3 viewDirection = normalize(cameraPosition - worldPosition.xyz);
    vFacing = max(dot(worldNormal, viewDirection), 0.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const cityFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying float vFacing;

  void main() {
    float pulse = 0.72 + 0.28 * sin(uTime * 1.65);
    float brightness = mix(0.44, 1.0, vFacing) * pulse;
    gl_FragColor = vec4(uColor * brightness, 0.88);
  }
`;

export const networkVertexShader = `
  attribute float aProgress;
  varying float vProgress;

  void main() {
    vProgress = aProgress;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const networkFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vProgress;

  void main() {
    float head = fract(uTime * 0.085);
    float distanceToHead = abs(vProgress - head);
    distanceToHead = min(distanceToHead, 1.0 - distanceToHead);
    float movingSignal = 1.0 - smoothstep(0.0, 0.085, distanceToHead);
    float trail = 0.24 + movingSignal * 0.76;
    gl_FragColor = vec4(uColor * trail, uOpacity * trail);
  }
`;
