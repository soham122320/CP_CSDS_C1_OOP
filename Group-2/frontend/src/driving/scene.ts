import * as T from "three";
import { HOMES, HOSPITAL, type Livery } from "./model";
import { RescueSession, door } from "./session";

const palette = {
  grass: 0x87ad85,
  road: 0x3d4c4a,
  sidewalk: 0xd5d4c6,
  cream: 0xf4eedf,
  teal: 0x235e56,
};
export class RescueScene {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(44, 1, 0.1, 600);
  renderer: T.WebGLRenderer;
  private frame = 0;
  private clock = new T.Clock();
  private car: T.Group;
  private paramedic: T.Group;
  private partner: T.Group;
  private marker: T.Group;
  private hospitalMarker: T.Group;
  private doors: T.Group[] = [];
  private traffic: T.Group[] = [];
  private red: T.Mesh;
  private blue: T.Mesh;
  private fallen: T.Group;
  private rain?: T.Points;
  private rainPositions?: Float32Array;
  private materials: T.Material[] = [];
  private geometries: T.BufferGeometry[] = [];
  private textures: T.Texture[] = [];
  private resizeObserver: ResizeObserver;
  private headlight: T.SpotLight;
  private callSigns: T.Group[] = [];
  private disposed = false;
  private slowFrames = 0;
  constructor(
    private host: HTMLElement,
    public session: RescueSession,
    private livery: Livery,
    private onFrame: (dt: number) => void,
    private preview = false,
    stationLevel = 0,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !preview && innerWidth > 760;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.host.appendChild(this.renderer.domElement);
    const night = session.mission.weather === "night",
      rain = session.mission.weather === "rain";
    this.scene.background = new T.Color(
      night ? "#182d36" : rain ? "#9cbbb8" : "#c6ded3",
    );
    this.scene.fog = new T.Fog(this.scene.background, 100, 260);
    this.scene.add(
      new T.HemisphereLight(
        night ? 0x91b4cf : 0xffffff,
        night ? 0x2a4542 : 0x769878,
        night ? 1.4 : 2.4,
      ),
    );
    const sun = new T.DirectionalLight(
      night ? 0x9fbddd : 0xffefd1,
      night ? 1.2 : 3.1,
    );
    sun.position.set(-45, 85, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.normalBias = 0.06;
    this.scene.add(sun);
    this.box(this.scene, 0, -0.25, 0, 210, 0.4, 210, palette.grass);
    for (const axis of [0, 1])
      for (const r of [-60, 0, 60]) {
        this.box(
          this.scene,
          axis ? r : 0,
          0.015,
          axis ? 0 : r,
          axis ? 15 : 202,
          0.08,
          axis ? 202 : 15,
          palette.sidewalk,
        );
        const road = this.box(
          this.scene,
          axis ? r : 0,
          0.07,
          axis ? 0 : r,
          axis ? 12 : 202,
          0.08,
          axis ? 202 : 12,
          rain ? 0x344747 : palette.road,
        );
        (road.material as T.MeshStandardMaterial).roughness = rain
          ? 0.28
          : 0.82;
        for (let n = -95; n <= 95; n += 9)
          if (Math.min(...[-60, 0, 60].map((v) => Math.abs(n - v))) > 10)
            this.box(
              this.scene,
              axis ? r : n,
              0.12,
              axis ? n : r,
              axis ? 0.13 : 3.5,
              0.02,
              axis ? 3.5 : 0.13,
              0xf2db94,
            );
      }
    for (const x of [-60, 0, 60])
      for (const z of [-60, 0, 60])
        for (let i = -4; i <= 4; i += 2)
          this.box(this.scene, x + i, 0.14, z + 8, 0.9, 0.03, 3, 0xe4e6d9);
    HOMES.forEach((h, i) => this.house(h.x, h.z, i, night));
    this.hospital(night);
    this.station(stationLevel);
    for (const call of session.calls) {
      const sign = new T.Group();
      const p = door(call.house);
      sign.position.set(p.x, 7, p.z);
      this.text(sign, "SOS", 0, 0, 0, 3, 1.2, 0, "#994f35", "#fff3dc");
      sign.userData.callId = call.id;
      this.scene.add(sign);
      this.callSigns.push(sign);
    }
    for (let i = 0; i < 38; i++) {
      const x = Math.sin(i * 4.1) * 88,
        z = Math.cos(i * 2.7) * 90;
      if (
        Math.min(
          ...[-60, 0, 60].flatMap((r) => [Math.abs(x - r), Math.abs(z - r)]),
        ) > 10 &&
        !HOMES.some((h) => Math.hypot(x - h.x, z - h.z) < 11) &&
        Math.hypot(x + 28, z - 43) > 20
      )
        this.tree(x, z);
    }
    for (const r of [-60, 0, 60])
      for (const z of [-45, 15, 75]) {
        this.box(this.scene, r + 8, 3.2, z, 0.2, 6.4, 0.2, 0x45615b);
        this.box(
          this.scene,
          r + 7.2,
          6.4,
          z,
          2,
          0.25,
          0.65,
          night ? 0xffd79a : 0xf2eedb,
        );
      }
    for (let i = 0; i < 8; i++) {
      const p = this.person(i % 2 ? 0xdbad7b : 0x4b7770);
      p.position.set(-8 - (i % 2), 0, -52 + i * 16);
      p.userData.walker = i;
      this.scene.add(p);
    }
    const nurse = this.person(0x6faeaf);
    nurse.position.set(-24, 0, 55);
    this.scene.add(nurse);
    this.car = this.ambulance(livery);
    this.scene.add(this.car);
    this.red = this.car.getObjectByName("red-light") as T.Mesh;
    this.blue = this.car.getObjectByName("blue-light") as T.Mesh;
    this.paramedic = this.person(0xe9764e);
    this.partner = this.person(0x2e8a85);
    this.scene.add(this.paramedic, this.partner);
    const stretcher = new T.Group();
    this.box(stretcher, 0, 0.6, 0, 1.1, 0.18, 2.4, 0xeed9b3);
    this.box(stretcher, 0, 0.79, 0, 0.7, 0.22, 1.8, 0xd6e8d9);
    for (const x of [-0.65, 0.65])
      this.box(stretcher, x, 0.6, 0, 0.09, 0.1, 3, 0x8caaa3);
    stretcher.name = "stretcher";
    this.box(stretcher, 0, 1.01, 0.2, 0.6, 0.25, 1.4, 0x69a6a1);
    this.sphere(stretcher, 0, 1.03, -0.65, 0.26, 0xd7aa85);
    this.paramedic.add(stretcher);
    this.marker = this.beacon(0x42e3bc);
    this.hospitalMarker = this.beacon(0x65db9a);
    this.scene.add(this.marker, this.hospitalMarker);
    this.hospitalMarker.position.set(HOSPITAL.x, 0, HOSPITAL.z);
    this.fallen = new T.Group();
    this.box(this.fallen, 0, 0.8, -25, 13, 1.3, 2, 0x765745);
    for (let i = -1; i <= 1; i++)
      this.sphere(this.fallen, i * 3, 1.3, -25, 2.4, 0x477b4f);
    this.scene.add(this.fallen);
    session.traffic.forEach((_, i) => {
      const c = new T.Group();
      this.box(
        c,
        0,
        0.65,
        0,
        2.2,
        0.8,
        4.1,
        [0xd3a456, 0x8c9dcb, 0xe6e7da][i % 3],
      );
      this.box(c, 0, 1.25, 0, 1.9, 0.6, 2, 0xabc8c9);
      for (const x of [-1.1, 1.1])
        for (const z of [-1.3, 1.3])
          this.box(c, x, 0.35, z, 0.25, 0.6, 0.65, 0x263837);
      this.scene.add(c);
      this.traffic.push(c);
    });
    this.headlight = new T.SpotLight(
      0xffe4af,
      night ? 75 : 0,
      48,
      0.48,
      0.6,
      1,
    );
    this.headlight.position.set(0, 1, 2.5);
    this.headlight.target.position.set(0, 0, 30);
    this.car.add(this.headlight, this.headlight.target);
    if (rain) {
      this.rainPositions = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) {
        this.rainPositions[i * 3] = ((i * 13.7) % 180) - 90;
        this.rainPositions[i * 3 + 1] = (i * 1.7) % 35;
        this.rainPositions[i * 3 + 2] = ((i * 17.3) % 180) - 90;
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.BufferAttribute(this.rainPositions, 3));
      this.geometries.push(g);
      const m = new T.PointsMaterial({
        color: 0xd9efed,
        size: 0.12,
        transparent: true,
        opacity: 0.7,
      });
      this.materials.push(m);
      this.rain = new T.Points(g, m);
      this.scene.add(this.rain);
    }
    this.camera.position.set(30, 35, 110);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.animate();
  }
  private material(color: T.ColorRepresentation) {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.82 });
    this.materials.push(m);
    return m;
  }
  private box(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: T.ColorRepresentation,
  ) {
    const g = new T.BoxGeometry(w, h, d);
    this.geometries.push(g);
    const m = new T.Mesh(g, this.material(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private sphere(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    color: number,
  ) {
    const g = new T.IcosahedronGeometry(r, 1);
    this.geometries.push(g);
    const m = new T.Mesh(g, this.material(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  private text(
    parent: T.Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    rotation = 0,
    color = "#204b44",
    background = "#f5f0dd",
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.font = "bold 50px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 67, 480);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    this.textures.push(texture);
    const material = new T.MeshBasicMaterial({
      map: texture,
      side: T.DoubleSide,
    });
    this.materials.push(material);
    const geometry = new T.PlaneGeometry(w, h);
    this.geometries.push(geometry);
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.rotation.y = rotation;
    parent.add(m);
  }
  private tree(x: number, z: number) {
    this.box(this.scene, x, 1.6, z, 0.5, 3.2, 0.5, 0x795e46);
    this.sphere(this.scene, x, 4.3, z, 2.6, 0x4d835a);
  }
  private house(x: number, z: number, id: number, night: boolean) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    const colors = [0xe9d8bd, 0xf1ece0, 0xb0c6b6, 0xd6a68d];
    this.box(g, 0, 2.5, 0, 10, 5, 10, colors[id % 4]);
    this.box(g, 0, 0.25, 0, 10.5, 0.5, 10.5, 0xd9d0bd);
    const roofGeo = new T.ConeGeometry(8.2, 3, 4);
    this.geometries.push(roofGeo);
    const roof = new T.Mesh(
      roofGeo,
      this.material([0x637a74, 0x9a6955, 0x4b6665][id % 3]),
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 6.5;
    roof.castShadow = true;
    g.add(roof);
    this.box(g, 2, 7, -1, 1, 3, 1, 0xc4b39a);
    const sign = Math.sign(door(id).z - z);
    for (const side of [-1, 1]) {
      this.box(
        g,
        side * 3,
        2.8,
        sign * 5.03,
        2.2,
        1.7,
        0.15,
        night ? 0xe9c87b : 0x7eaaa9,
      );
      this.box(g, side * 3, 2.8, sign * 5.16, 0.08, 1.7, 0.1, 0xf6efda);
    }
    const pivot = new T.Group();
    pivot.position.set(-0.8, 0, sign * 5.15);
    this.box(pivot, 0.8, 1.5, 0, 1.6, 3, 0.18, 0x4d6e65);
    this.sphere(pivot, 1.35, 1.4, sign * 0.15, 0.09, 0xd9b66b);
    g.add(pivot);
    this.doors[id] = pivot;
    const d = door(id);
    let road = [-60, 0, 60].sort(
      (a, b) => Math.abs(a - z) - Math.abs(b - z),
    )[0];
    this.box(
      this.scene,
      x,
      0.045,
      (d.z + road) / 2,
      3,
      0.05,
      Math.abs(d.z - road),
      0xcccbba,
    );
    this.text(
      g,
      String(id + 1),
      0,
      3.8,
      sign * 5.18,
      1.3,
      0.5,
      sign < 0 ? Math.PI : 0,
    );
    this.scene.add(g);
    const family = this.person(0xd7a65a);
    family.position.set(x + 3, 0, d.z + sign * 0.5);
    family.userData.family = id;
    this.scene.add(family);
  }
  private hospital(night: boolean) {
    const hospital = new T.Group();
    hospital.position.z = 13;
    this.scene.add(hospital);
    this.box(hospital, -28, 5, 30, 23, 10, 16, 0xf0f0de);
    this.box(hospital, -28, 10.3, 30, 24, 0.6, 17, 0x536f6b);
    this.box(hospital, -28, 3, 38.15, 8, 5, 0.3, 0x7aa9a7);
    this.box(hospital, -28, 5.9, 40, 13, 0.4, 4, 0x246d60);
    this.text(hospital, "EMERGENCY", -28, 7.4, 38.25, 14, 1.8);
    this.box(hospital, -28, 9.2, 38.3, 3, 0.7, 0.2, 0xe56a51);
    this.box(hospital, -28, 9.2, 38.31, 0.7, 3, 0.2, 0xe56a51);
    for (const x of [-36, -20])
      this.box(hospital, x, 7, 38.12, 3, 2, 0.2, night ? 0xf4d79b : 0x91baba);
    this.box(hospital, -28, 0.14, 49, 20, 0.05, 20, 0xb9c7b9);
    this.text(hospital, "HOSPITAL", -28, 0.2, 49, 11, 2, -Math.PI / 2);
  }
  private station(level: number) {
    this.box(this.scene, 31, 0, 91, 44, 0.1, 13, 0xb4c4af);
    const buildings = level >= 6 ? 3 : level >= 3 ? 2 : 1;
    for (let i = 0; i < buildings; i++) {
      this.box(this.scene, 18 + i * 13, 3.5, 91, 12, 7, 12, 0xddd7bd);
      this.box(this.scene, 18 + i * 13, 3, 84.9, 10, 5, 0.2, 0x56736a);
      this.box(this.scene, 18 + i * 13, 7.3, 91, 13, 0.5, 13, 0x3c6559);
    }
    this.text(this.scene, "RESCUE STATION", 18, 6.4, 84.7, 12, 1.2, Math.PI);
  }
  private person(color: number) {
    const g = new T.Group();
    this.box(g, 0, 1.15, 0, 0.7, 1, 0.4, color);
    this.sphere(g, 0, 1.95, 0, 0.33, 0xd7aa85);
    for (const x of [-0.23, 0.23])
      this.box(g, x, 0.35, 0, 0.25, 0.7, 0.3, 0x294b49);
    for (const x of [-0.5, 0.5]) this.box(g, x, 1.1, 0, 0.22, 0.8, 0.24, color);
    return g;
  }
  private ambulance(livery: Livery) {
    const g = new T.Group();
    if (this.session.vehicle.capacity === 2)
      this.box(g, 0, 2.9, -0.7, 2.7, 0.45, 3.7, livery.color);
    this.box(g, 0, 1.6, -0.4, 2.6, 2.4, 3.8, livery.color);
    this.box(g, 0, 1.05, 2, 2.45, 1.3, 1.65, livery.color);
    this.box(g, 0, 1.9, 1.5, 2.35, 0.9, 1.6, 0x254847);
    this.box(g, 0, 2.45, 1.5, 2.6, 0.2, 1.8, livery.color);
    this.box(g, 0, 0.55, 0, 2.8, 0.3, 5.7, 0x354e49);
    for (const x of [-1.33, 1.33]) {
      this.box(g, x, 1.2, -0.4, 0.04, 0.4, 3.8, 0xe86e4d);
      this.box(g, x, 2, -1, 0.04, 0.35, 1, 0xe86e4d);
      this.box(g, x, 2, -1, 0.04, 1, 0.35, 0xe86e4d);
      this.text(
        g,
        livery.decal,
        x * 1.012,
        1.85,
        0.4,
        1.3,
        0.4,
        (Math.sign(x) * Math.PI) / 2,
      );
    }
    this.text(g, livery.name, 0, 1.8, -2.32, 2.2, 0.45, Math.PI);
    for (const x of [-1.4, 1.4])
      for (const z of [-1.5, 1.75]) {
        const wheel = this.box(g, x, 0.55, z, 0.35, 0.85, 0.85, 0x263d38);
        wheel.name = "wheel";
        this.box(g, x * 1.04, 0.55, z, 0.08, 0.38, 0.38, 0xc4d2ca);
      }
    this.box(g, 0, 2.95, 0.2, 2, 0.15, 0.6, 0x566f68);
    const red = this.box(g, -0.65, 3.1, 0.2, 0.65, 0.22, 0.5, 0xfa563e);
    red.name = "red-light";
    const blue = this.box(g, 0.65, 3.1, 0.2, 0.65, 0.22, 0.5, 0x4ebce0);
    blue.name = "blue-light";
    for (const x of [-0.85, 0.85])
      this.box(g, x, 1.3, 2.84, 0.5, 0.25, 0.05, 0xffe9ae);
    return g;
  }
  private beacon(color: number) {
    const g = new T.Group();
    const geo = new T.TorusGeometry(2.5, 0.1, 6, 32);
    this.geometries.push(geo);
    const ring = new T.Mesh(geo, this.material(color));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.22;
    g.add(ring);
    this.box(g, 0, 5.5, 0, 0.14, 8, 0.14, color);
    const diamond = this.box(g, 0, 10, 0, 1.3, 1.3, 1.3, color);
    diamond.rotation.z = Math.PI / 4;
    return g;
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.25);
    if (
      dt > 0.08 &&
      this.renderer.shadowMap.enabled &&
      ++this.slowFrames > 10
    ) {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1);
      this.resize();
    }
    this.onFrame(dt);
    if (this.disposed) return;
    const s = this.session,
      t = s.elapsed;
    this.car.position.set(s.car.x, 0, s.car.z);
    this.car.rotation.y = s.car.angle;
    this.paramedic.visible = s.stage !== "driving";
    this.paramedic.position.set(s.person.x, 0, s.person.z);
    this.paramedic.rotation.y = s.person.angle;
    this.paramedic.getObjectByName("stretcher")!.visible =
      s.stage === "carrying";
    if (s.stage !== "driving" && !this.partner.visible)
      this.partner.position.set(s.person.x + 1.4, 0, s.person.z + 0.6);
    this.partner.visible = s.stage !== "driving";
    this.partner.position.lerp(
      new T.Vector3(s.person.x + 1.4, 0, s.person.z + 0.6),
      0.12,
    );
    this.partner.rotation.y = s.person.angle;
    const flash = s.siren || this.preview;
    const alternate =
      Math.floor(t * (this.livery.lights === "strobe" ? 12 : 3)) % 2 === 0;
    for (const [mesh, on] of [
      [this.red, alternate],
      [this.blue, !alternate],
    ] as [T.Mesh, boolean][]) {
      const mat = mesh.material as T.MeshStandardMaterial;
      mat.emissive.copy(mat.color);
      mat.emissiveIntensity = flash && on ? 3 : 0;
    }
    const show =
      s.current.status === "waiting" || s.current.status === "carried";
    this.marker.visible = show;
    const target = s.stage === "carrying" ? s.car : door(s.current.house);
    this.marker.position.set(target.x, Math.sin(t * 2) * 0.3, target.z);
    this.marker.rotation.y = t * 0.4;
    this.hospitalMarker.visible = !!s.onboard.length;
    this.callSigns.forEach((sign) => {
      const call = s.calls.find((c) => c.id === sign.userData.callId);
      sign.visible = call?.status === "waiting";
      if (call) {
        const p = door(call.house);
        sign.position.set(p.x, 7, p.z);
      }
    });
    this.doors.forEach((d, i) => {
      const call = s.calls.find((c) => c.house === i);
      const open =
        (call && call.status !== "waiting") ||
        (s.current.house === i && s.stage === "treating");
      d.rotation.y = T.MathUtils.lerp(d.rotation.y, open ? -1.3 : 0, 0.08);
    });
    this.traffic.forEach((mesh, i) => {
      const c = s.traffic[i];
      mesh.position.set(c.x, 0, c.z);
      mesh.rotation.y = c.angle;
    });
    this.fallen.visible = s.event;
    for (const child of this.scene.children) {
      if (child.userData.walker !== undefined) {
        const i = child.userData.walker;
        child.position.z = -65 + ((t * 1.1 + i * 17) % 130);
        child.position.y = Math.sin(t * 5 + i) * 0.025;
      }
      if (child.userData.family !== undefined) {
        const call = s.calls.find((c) => c.house === child.userData.family);
        child.visible = !!call && call.status !== "delivered";
        child.rotation.y = Math.sin(t * 2) * 0.2;
      }
    }
    if (this.rainPositions && this.rain) {
      for (let i = 1; i < this.rainPositions.length; i += 3) {
        this.rainPositions[i] -= dt * 22;
        if (this.rainPositions[i] < 0) this.rainPositions[i] = 35;
      }
      (
        this.rain.geometry.attributes.position as T.BufferAttribute
      ).needsUpdate = true;
    }
    const actor = s.actor;
    let desired: T.Vector3;
    if (this.preview) {
      desired = new T.Vector3(s.car.x + 22, 19, s.car.z + 25);
      this.camera.position.lerp(desired, 0.05);
      this.camera.lookAt(s.car.x - 2, 1, s.car.z - 5);
    } else {
      desired =
        s.stage === "driving"
          ? new T.Vector3(
              actor.x - Math.sin(s.car.angle) * 17,
              13,
              actor.z - Math.cos(s.car.angle) * 17,
            )
          : new T.Vector3(actor.x, 18, actor.z + 17);
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
      this.camera.lookAt(actor.x, 1, actor.z);
    }
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
