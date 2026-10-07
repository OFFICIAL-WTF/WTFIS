import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Point = { x: number; y: number };
type RoutePathName =
  | "agent-cli"
  | "agent-tui"
  | "you-cli"
  | "you-tui"
  | "cli-merge"
  | "tui-merge"
  | "merge-output";

const PATH_NAMES: RoutePathName[] = [
  "agent-cli",
  "agent-tui",
  "you-cli",
  "you-tui",
  "cli-merge",
  "tui-merge",
  "merge-output",
];

const getPath = (root: HTMLElement, name: RoutePathName) =>
  root.querySelector<SVGPathElement>(`[data-route-path="${name}"]`);

const getPoint = (element: Element, stageBox: DOMRect, edge: "top" | "bottom"): Point => {
  const box = element.getBoundingClientRect();
  return {
    x: box.left - stageBox.left + box.width / 2,
    y: (edge === "top" ? box.top : box.bottom) - stageBox.top,
  };
};

const upperPath = (start: Point, end: Point) => {
  const middleY = start.y + Math.max(22, (end.y - start.y) * 0.54);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${start.x.toFixed(2)} ${middleY.toFixed(2)} L ${end.x.toFixed(2)} ${middleY.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

const lowerPath = (start: Point, merge: Point) => {
  const bendY = start.y + Math.max(18, (merge.y - start.y) * 0.42);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${start.x.toFixed(2)} ${bendY.toFixed(2)} L ${merge.x.toFixed(2)} ${merge.y.toFixed(2)}`;
};

const finalPath = (merge: Point, imageTop: Point) => {
  const beforeImage = imageTop.y - Math.min(24, Math.max(10, imageTop.y - merge.y) * 0.2);
  return `M ${merge.x.toFixed(2)} ${merge.y.toFixed(2)} L ${merge.x.toFixed(2)} ${beforeImage.toFixed(2)} L ${imageTop.x.toFixed(2)} ${imageTop.y.toFixed(2)}`;
};

const initRouteStory = (root: HTMLElement) => {
  const stage = root.querySelector<HTMLElement>("[data-route-stage]");
  const svg = root.querySelector<SVGSVGElement>("[data-route-lines]");
  const agent = root.querySelector<HTMLElement>('[data-route-node="agent"] .fgen-route-label');
  const you = root.querySelector<HTMLElement>('[data-route-node="you"] .fgen-route-label');
  const cli = root.querySelector<HTMLElement>('[data-terminal="cli"]');
  const tui = root.querySelector<HTMLElement>('[data-terminal="tui"]');
  const image = root.querySelector<HTMLElement>(".fgen-route-image");
  const command = root.querySelector<HTMLElement>("[data-cli-command]");
  const status = root.querySelector<HTMLElement>("[data-cli-status]");
  const progress = root.querySelector<HTMLElement>("[data-cli-progress]");
  const result = root.querySelector<HTMLElement>("[data-cli-result]");
  const prompt = root.querySelector<HTMLElement>("[data-tui-prompt]");
  const grid = root.querySelector<HTMLElement>("[data-tui-grid]");
  const gridImages = grid ? Array.from(grid.querySelectorAll<HTMLElement>("img")) : [];
  const paths = PATH_NAMES.map((name) => getPath(root, name)).filter(
    (path): path is SVGPathElement => Boolean(path),
  );

  if (!stage || !svg || !agent || !you || !cli || !tui || !image || paths.length !== PATH_NAMES.length) return;

  let frame = 0;

  const refreshGeometry = () => {
    const stageBox = stage.getBoundingClientRect();
    if (!stageBox.width || !stageBox.height) return;

    svg.setAttribute("viewBox", `0 0 ${stageBox.width} ${stageBox.height}`);

    const agentPoint = getPoint(agent, stageBox, "bottom");
    const youPoint = getPoint(you, stageBox, "bottom");
    const cliTop = getPoint(cli, stageBox, "top");
    const tuiTop = getPoint(tui, stageBox, "top");
    const cliBottom = getPoint(cli, stageBox, "bottom");
    const tuiBottom = getPoint(tui, stageBox, "bottom");
    const merge: Point = {
      x: stageBox.width / 2,
      y: Math.max(cliBottom.y, tuiBottom.y) + Math.max(34, stageBox.height * 0.025),
    };
    const imageTop = getPoint(image, stageBox, "top");

    const pathsByName: Record<RoutePathName, string> = {
      "agent-cli": upperPath(agentPoint, cliTop),
      "agent-tui": upperPath(agentPoint, tuiTop),
      "you-cli": upperPath(youPoint, cliTop),
      "you-tui": upperPath(youPoint, tuiTop),
      "cli-merge": lowerPath(cliBottom, merge),
      "tui-merge": lowerPath(tuiBottom, merge),
      "merge-output": finalPath(merge, imageTop),
    };

    PATH_NAMES.forEach((name, index) => {
      paths[index].setAttribute("d", pathsByName[name]);
    });
  };

  const scheduleGeometry = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      refreshGeometry();
      ScrollTrigger.refresh();
    });
  };

  refreshGeometry();

  gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
    const commandText = command?.textContent ?? "";
    const typing = { count: 0 };
    gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(image, { opacity: 0.72 });
    if (command) command.textContent = "";
    if (progress) gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
    if (status) gsap.set(status, { opacity: 0.4 });
    if (result) gsap.set(result, { opacity: 0, y: 8 });
    if (prompt) gsap.set(prompt, { opacity: 0, y: 8 });
    if (grid) gsap.set(grid, { opacity: 0, y: 12 });
    if (gridImages.length) gsap.set(gridImages, { opacity: 0.4, scale: 0.92, transformOrigin: "50% 50%" });

    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top 76%",
        end: "bottom 86%",
        scrub: 1,
      },
    });

    timeline.to(paths.slice(0, 4), { strokeDashoffset: 0, duration: 1.35 }, 0);
    if (status) timeline.to(status, { opacity: 1, duration: 0.12 }, 0.9);
    if (command) timeline.to(typing, {
      count: commandText.length,
      snap: "count",
      duration: 0.55,
      onUpdate: () => { command.textContent = commandText.slice(0, typing.count); },
    }, 1.02);
    if (progress) timeline.to(progress, { scaleX: 1, duration: 0.75 }, 1.42);
    if (prompt) timeline.to(prompt, { opacity: 1, y: 0, duration: 0.2 }, 1.55);
    if (grid) timeline.to(grid, { opacity: 1, y: 0, duration: 0.28 }, 1.72);
    if (gridImages.length) timeline.to(gridImages, { opacity: 1, scale: 1, duration: 0.28, stagger: 0.06 }, 1.78);
    if (result) timeline.to(result, { opacity: 1, y: 0, duration: 0.2 }, 2.18);
    timeline.to(paths.slice(4, 6), { strokeDashoffset: 0, duration: 0.72, stagger: 0.1 }, 2.35);
    timeline.to(paths[6], { strokeDashoffset: 0, duration: 0.42 }, 3.16);
    timeline.to(image, { opacity: 1, duration: 0.42 }, 3.28);

    return () => {
      if (command) command.textContent = commandText;
    };
  });

  const observer = new ResizeObserver(scheduleGeometry);
  observer.observe(stage);
  document.fonts.ready.then(scheduleGeometry);
  window.addEventListener("resize", scheduleGeometry, { passive: true });
};

export default function initFgenRoutes() {
  if (typeof window === "undefined") return;
  document.querySelectorAll<HTMLElement>("[data-fgen-routes]").forEach(initRouteStory);
}
