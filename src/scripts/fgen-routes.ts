import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Point = { x: number; y: number };
type RoutePathName =
  | "agent-cli"
  | "you-tui"
  | "cli-merge"
  | "tui-merge"
  | "merge-output";

const PATH_NAMES: RoutePathName[] = [
  "agent-cli",
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

const roundedPath = (start: Point, end: Point, bendAt = 0.5) => {
  const distance = end.y - start.y;
  const direction = Math.sign(end.x - start.x);
  const radius = Math.min(32, Math.abs(end.x - start.x) / 2, Math.max(0, distance) * Math.min(bendAt, 1 - bendAt));
  const bendY = start.y + distance * bendAt;
  return [
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `V ${(bendY - radius).toFixed(2)}`,
    `Q ${start.x.toFixed(2)} ${bendY.toFixed(2)} ${(start.x + direction * radius).toFixed(2)} ${bendY.toFixed(2)}`,
    `H ${(end.x - direction * radius).toFixed(2)}`,
    `Q ${end.x.toFixed(2)} ${bendY.toFixed(2)} ${end.x.toFixed(2)} ${(bendY + radius).toFixed(2)}`,
    `V ${end.y.toFixed(2)}`,
  ].join(" ");
};

const initRouteStory = (root: HTMLElement) => {
  const stage = root.querySelector<HTMLElement>("[data-route-stage]");
  const svg = root.querySelector<SVGSVGElement>("[data-route-lines]");
  const agent = root.querySelector<HTMLElement>('[data-route-node="agent"]');
  const you = root.querySelector<HTMLElement>('[data-route-node="you"]');
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

  if (
    !stage ||
    !svg ||
    !agent ||
    !you ||
    !cli ||
    !tui ||
    !image ||
    paths.length !== PATH_NAMES.length
  ) return;

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
    const imageTop = getPoint(image, stageBox, "top");
    const terminalBottom = Math.max(cliBottom.y, tuiBottom.y);
    const lowerTravel = Math.max(120, imageTop.y - terminalBottom);
    const merge: Point = {
      x: stageBox.width / 2,
      y: terminalBottom + lowerTravel * 0.52,
    };

    const pathsByName: Record<RoutePathName, string> = {
      "agent-cli": roundedPath(agentPoint, cliTop),
      "you-tui": roundedPath(youPoint, tuiTop),
      "cli-merge": roundedPath(cliBottom, merge, 0.62),
      "tui-merge": roundedPath(tuiBottom, merge, 0.62),
      "merge-output": roundedPath(merge, imageTop),
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
    const pathByName = Object.fromEntries(
      PATH_NAMES.map((name, index) => [name, paths[index]]),
    ) as Record<RoutePathName, SVGPathElement>;

    gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(image, { opacity: 0.72 });
    if (command) command.textContent = "";
    if (progress) gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
    if (status) gsap.set(status, { opacity: 0.4 });
    if (result) gsap.set(result, { opacity: 0, y: 8 });
    if (prompt) gsap.set(prompt, { opacity: 0, y: 8 });
    if (grid) gsap.set(grid, { opacity: 0, y: 12 });
    if (gridImages.length) gsap.set(gridImages, { opacity: 0.4, scale: 0.92, transformOrigin: "50% 50%" });

    const upperRoutes: Array<[RoutePathName, HTMLElement, HTMLElement]> = [
      ["agent-cli", agent, cli],
      ["you-tui", you, tui],
    ];

    upperRoutes.forEach(([name, start, end]) => {
      gsap.to(pathByName[name], {
        strokeDashoffset: 0,
        autoRound: false,
        ease: "none",
        scrollTrigger: {
          trigger: start,
          start: "bottom 84%",
          endTrigger: end,
          end: "top 34%",
          scrub: true,
          invalidateOnRefresh: true,
          id: `fgen-upper-${name}`,
        },
      });
    });

    const cliDemo = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: cli,
        start: "top 84%",
        end: "top 20%",
        scrub: 0.8,
        invalidateOnRefresh: true,
        id: "fgen-cli-demo",
      },
    });
    if (status) cliDemo.to(status, { opacity: 1, duration: 0.12 }, 0.34);
    if (command) cliDemo.to(typing, {
      count: commandText.length,
      snap: "count",
      duration: 0.58,
      onUpdate: () => { command.textContent = commandText.slice(0, typing.count); },
    }, 0.42);
    if (progress) cliDemo.to(progress, { scaleX: 1, duration: 0.75 }, 1.08);
    if (result) cliDemo.to(result, { opacity: 1, y: 0, duration: 0.22 }, 1.9);

    const tuiDemo = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: tui,
        start: "top 84%",
        end: "top 20%",
        scrub: 0.8,
        invalidateOnRefresh: true,
        id: "fgen-tui-demo",
      },
    });
    if (prompt) tuiDemo.to(prompt, { opacity: 1, y: 0, duration: 0.2 }, 0.34);
    if (grid) tuiDemo.to(grid, { opacity: 1, y: 0, duration: 0.28 }, 0.68);
    if (gridImages.length) tuiDemo.to(gridImages, { opacity: 1, scale: 1, duration: 0.28, stagger: 0.06 }, 0.82);

    const lowerRoutes: Array<[RoutePathName, HTMLElement]> = [
      ["cli-merge", cli],
      ["tui-merge", tui],
    ];
    lowerRoutes.forEach(([name, start]) => {
      gsap.to(pathByName[name], {
        strokeDashoffset: 0,
        autoRound: false,
        ease: "none",
        scrollTrigger: {
          trigger: start,
          start: "bottom 78%",
          endTrigger: image,
          end: "top 58%",
          scrub: true,
          invalidateOnRefresh: true,
          id: `fgen-lower-${name}`,
        },
      });
    });

    const outputTimeline = gsap.timeline({
      defaults: { ease: "none", autoRound: false },
      scrollTrigger: {
        trigger: image,
        start: "top 64%",
        end: "top 24%",
        scrub: 0.8,
        invalidateOnRefresh: true,
        id: "fgen-route-output",
      },
    });
    outputTimeline
      .to(pathByName["merge-output"], { strokeDashoffset: 0, duration: 0.72 }, 0)
      .to(image, { opacity: 1, duration: 0.48 }, 0.34);

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
