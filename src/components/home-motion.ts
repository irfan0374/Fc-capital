"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export function useHomeMotion(
  root: RefObject<HTMLElement | null>,
  ready: boolean,
) {
  useEffect(() => {
    if (!ready || !root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(
      {
        desktop: "(min-width: 900px)",
        motion: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        if (!context.conditions?.motion || !root.current) return;
        const desktop = context.conditions.desktop;
        const scope = gsap.utils.selector(root.current);
        const scene = gsap.context(() => {
          gsap.from(".hero-copy > *", {
            y: 22,
            opacity: 0,
            stagger: 0.09,
            duration: 0.65,
            ease: "power2.out",
            clearProps: "all",
          });
          gsap.to(".floating-card", {
            y: desktop ? -12 : -10,
            rotation: (index) => (index === 0 ? -3 : index === 1 ? 3 : -1),
            stagger: 0.5,
            duration: 3.4,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
          gsap.to(".orbit-inner", {
            rotation: 360,
            duration: 100,
            repeat: -1,
            ease: "none",
          });
          {
            gsap.fromTo(
              ".desktop-photo",
              { y: desktop ? 22 : 14, rotation: 0 },
              {
                y: desktop ? -15 : -12,
                rotation: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: ".platform-section",
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.6,
                },
              },
            );
            gsap.fromTo(
              ".mobile-photo",
              { y: desktop ? 40 : 24, rotation: desktop ? 2 : 0 },
              {
                y: desktop ? -30 : -18,
                rotation: desktop ? -2 : 0,
                ease: "none",
                scrollTrigger: {
                  trigger: ".platform-section",
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.7,
                },
              },
            );
            const stack = scope(".learn-grid")[0] as HTMLElement;
            stack.classList.add("motion-stack");
            scope(".learn-card").forEach((card: HTMLElement, index: number) => {
              const rotations = desktop ? [-4, 3, -2] : [-2.5, 2, -1.5];
              gsap.fromTo(
                card,
                { rotation: rotations[index], scale: 0.96 },
                {
                  rotation: index === 1 ? -1.5 : 1.5,
                  scale: 1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: card,
                    start: "top 88%",
                    end: "top 22%",
                    scrub: 0.5,
                    invalidateOnRefresh: true,
                  },
                },
              );
            });
          }
          scope(
            ".section-heading, .platform-copy, .benefits article, .process article",
          ).forEach((element: HTMLElement) => {
            gsap.from(element, {
              y: desktop ? 22 : 30,
              opacity: 0.3,
              duration: 0.75,
              ease: "power2.out",
              scrollTrigger: { trigger: element, start: "top 92%", once: true },
              clearProps: "opacity,transform",
            });
          });
        }, root);
        let lenis: Lenis | undefined;
        let frame = 0;
        if (desktop) {
          lenis = new Lenis({
            anchors: true,
            duration: 1.05,
            prevent: (node) => node.tagName === "DIALOG",
          });
          lenis.on("scroll", ScrollTrigger.update);
          const tick = (time: number) => {
            lenis?.raf(time);
            frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        }
        ScrollTrigger.refresh();
        return () => {
          cancelAnimationFrame(frame);
          lenis?.destroy();
          scene.revert();
          scope(".learn-grid")[0]?.classList.remove("motion-stack");
        };
      },
    );
    return () => media.revert();
  }, [root, ready]);
}
