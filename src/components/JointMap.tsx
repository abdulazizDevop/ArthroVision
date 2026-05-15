import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface Joint {
  id: string;
  x: number; // pixel coords in source image (0-1024)
  y: number;
  label?: string;
}

// body-map.png — body content roughly x: 280-740, y: 60-1000
const BODY_JOINTS: Joint[] = [
  { id: "shoulder_l", x: 394, y: 240 },
  { id: "shoulder_r", x: 630, y: 240 },
  { id: "elbow_l", x: 364, y: 420 },
  { id: "elbow_r", x: 660, y: 420 },
  { id: "wrist_l", x: 338, y: 543 },
  { id: "wrist_r", x: 686, y: 543 },
  { id: "knee_l", x: 461, y: 737 },
  { id: "knee_r", x: 563, y: 737 },
];

// hand-right.png — thumb on right
const RIGHT_HAND_JOINTS: Joint[] = [
  { id: "mcp_r_1", x: 717, y: 594, label: "1" },
  { id: "mcp_r_2", x: 604, y: 471, label: "2" },
  { id: "mcp_r_3", x: 502, y: 461, label: "3" },
  { id: "mcp_r_4", x: 399, y: 481, label: "4" },
  { id: "mcp_r_5", x: 307, y: 543, label: "5" },
  { id: "pip_r_1", x: 748, y: 471, label: "1" },
  { id: "pip_r_2", x: 625, y: 297, label: "2" },
  { id: "pip_r_3", x: 512, y: 266, label: "3" },
  { id: "pip_r_4", x: 399, y: 287, label: "4" },
  { id: "pip_r_5", x: 276, y: 369, label: "5" },
];

// hand-left.png — thumb on left (mirror)
const LEFT_HAND_JOINTS: Joint[] = [
  { id: "mcp_l_1", x: 307, y: 594, label: "1" },
  { id: "mcp_l_2", x: 420, y: 471, label: "2" },
  { id: "mcp_l_3", x: 522, y: 461, label: "3" },
  { id: "mcp_l_4", x: 625, y: 481, label: "4" },
  { id: "mcp_l_5", x: 717, y: 543, label: "5" },
  { id: "pip_l_1", x: 276, y: 471, label: "1" },
  { id: "pip_l_2", x: 399, y: 297, label: "2" },
  { id: "pip_l_3", x: 512, y: 266, label: "3" },
  { id: "pip_l_4", x: 625, y: 287, label: "4" },
  { id: "pip_l_5", x: 748, y: 369, label: "5" },
];

// foot-right.png — big toe (M1) on right
const RIGHT_FOOT_JOINTS: Joint[] = [
  { id: "mtp_r_1", x: 584, y: 266, label: "1" },
  { id: "mtp_r_2", x: 481, y: 256, label: "2" },
  { id: "mtp_r_3", x: 399, y: 266, label: "3" },
  { id: "mtp_r_4", x: 328, y: 287, label: "4" },
  { id: "mtp_r_5", x: 266, y: 328, label: "5" },
];

// foot-left.png — big toe (M1) on left (mirror)
const LEFT_FOOT_JOINTS: Joint[] = [
  { id: "mtp_l_1", x: 440, y: 266, label: "1" },
  { id: "mtp_l_2", x: 543, y: 256, label: "2" },
  { id: "mtp_l_3", x: 625, y: 266, label: "3" },
  { id: "mtp_l_4", x: 696, y: 287, label: "4" },
  { id: "mtp_l_5", x: 758, y: 328, label: "5" },
];

const BODY_VIEWBOX = "280 50 460 950";
const HAND_VIEWBOX = "30 30 970 950";
const FOOT_VIEWBOX = "30 30 970 950";

interface JointMapProps {
  tenderJoints: string[];
  swollenJoints: string[];
  onToggleJoint: (id: string, type: "tender" | "swollen") => void;
}

function cycleJoint(
  id: string,
  isTender: boolean,
  isSwollen: boolean,
  onToggle: (id: string, type: "tender" | "swollen") => void,
) {
  if (!isTender && !isSwollen) {
    onToggle(id, "tender");
  } else if (isTender && !isSwollen) {
    onToggle(id, "tender");
    onToggle(id, "swollen");
  } else if (!isTender && isSwollen) {
    onToggle(id, "tender");
  } else {
    onToggle(id, "tender");
    onToggle(id, "swollen");
  }
}

interface JointPanelProps {
  title: string;
  image: string;
  viewBox: string;
  joints: Joint[];
  dotRadius: number;
  tenderJoints: string[];
  swollenJoints: string[];
  onToggleJoint: (id: string, type: "tender" | "swollen") => void;
  hoveredJoint: string | null;
  setHoveredJoint: (id: string | null) => void;
  jointNameLookup: (id: string) => string;
  shortTender: string;
  shortSwollen: string;
}

function JointPanel({
  title,
  image,
  viewBox,
  joints,
  dotRadius,
  tenderJoints,
  swollenJoints,
  onToggleJoint,
  hoveredJoint,
  setHoveredJoint,
  jointNameLookup,
  shortTender,
  shortSwollen,
}: JointPanelProps) {
  const panelIds = joints.map((j) => j.id);
  const panelTender = panelIds.filter((id) => tenderJoints.includes(id)).length;
  const panelSwollen = panelIds.filter((id) => swollenJoints.includes(id)).length;
  const hoverInPanel = hoveredJoint && panelIds.includes(hoveredJoint)
    ? jointNameLookup(hoveredJoint)
    : null;

  return (
    <div className="relative flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-linear-to-b from-white via-white/95 to-transparent z-10 pointer-events-none">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        <span className="text-[10px] font-semibold tabular-nums">
          <span className="text-red-500">{shortTender}: {panelTender}</span>
          <span className="text-gray-300 mx-1">|</span>
          <span className="text-blue-500">{shortSwollen}: {panelSwollen}</span>
        </span>
      </div>
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
      >
        <image href={image} x="0" y="0" width="1024" height="1024" />
        {joints.map((joint) => {
          const isTender = tenderJoints.includes(joint.id);
          const isSwollen = swollenJoints.includes(joint.id);
          let fill = "#ffffff";
          let stroke = "#6b7280";
          let textColor = "#374151";
          if (isTender && isSwollen) {
            fill = "#a855f7";
            stroke = "#6b21a8";
            textColor = "#ffffff";
          } else if (isTender) {
            fill = "#ef4444";
            stroke = "#991b1b";
            textColor = "#ffffff";
          } else if (isSwollen) {
            fill = "#3b82f6";
            stroke = "#1e40af";
            textColor = "#ffffff";
          }
          return (
            <g
              key={joint.id}
              className="cursor-pointer"
              onClick={() => cycleJoint(joint.id, isTender, isSwollen, onToggleJoint)}
              onMouseEnter={() => setHoveredJoint(joint.id)}
              onMouseLeave={() => setHoveredJoint(null)}
            >
              <circle
                cx={joint.x}
                cy={joint.y}
                r={dotRadius}
                fill={fill}
                stroke={stroke}
                strokeWidth={dotRadius * 0.18}
                className="transition-opacity hover:opacity-80"
              />
              {joint.label && (
                <text
                  x={joint.x}
                  y={joint.y}
                  fill={textColor}
                  fontSize={dotRadius * 1.1}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none"
                >
                  {joint.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hoverInPanel && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
          {hoverInPanel}
        </div>
      )}
    </div>
  );
}

export function JointMap({ tenderJoints, swollenJoints, onToggleJoint }: JointMapProps) {
  const { t } = useTranslation();
  const [hoveredJoint, setHoveredJoint] = useState<string | null>(null);

  const sharedProps = {
    tenderJoints,
    swollenJoints,
    onToggleJoint,
    hoveredJoint,
    setHoveredJoint,
    jointNameLookup: (id: string) => t(`joints.names.${id}`),
    shortTender: t("joints.tenderShort"),
    shortSwollen: t("joints.swollenShort"),
  };

  return (
    <div className="flex h-full w-full gap-2">
      <div className="flex-2 flex flex-col min-w-0">
        <JointPanel
          title={t("joints.bodyPanel")}
          image="/body-map.png"
          viewBox={BODY_VIEWBOX}
          joints={BODY_JOINTS}
          dotRadius={22}
          {...sharedProps}
        />
      </div>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <JointPanel
          title={t("joints.rightHandPanel")}
          image="/hand-right.png"
          viewBox={HAND_VIEWBOX}
          joints={RIGHT_HAND_JOINTS}
          dotRadius={45}
          {...sharedProps}
        />
        <JointPanel
          title={t("joints.leftHandPanel")}
          image="/hand-left.png"
          viewBox={HAND_VIEWBOX}
          joints={LEFT_HAND_JOINTS}
          dotRadius={45}
          {...sharedProps}
        />
      </div>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <JointPanel
          title={t("joints.rightFootPanel")}
          image="/foot-right.png"
          viewBox={FOOT_VIEWBOX}
          joints={RIGHT_FOOT_JOINTS}
          dotRadius={50}
          {...sharedProps}
        />
        <JointPanel
          title={t("joints.leftFootPanel")}
          image="/foot-left.png"
          viewBox={FOOT_VIEWBOX}
          joints={LEFT_FOOT_JOINTS}
          dotRadius={50}
          {...sharedProps}
        />
      </div>
    </div>
  );
}
