import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/src/lib/utils";

interface Joint {
  id: string;
  x: number;
  y: number;
}

const joints: Joint[] = [
  { id: "shoulder_l", x: 30, y: 20 },
  { id: "shoulder_r", x: 70, y: 20 },
  { id: "elbow_l", x: 20, y: 40 },
  { id: "elbow_r", x: 80, y: 40 },
  { id: "wrist_l", x: 15, y: 60 },
  { id: "wrist_r", x: 85, y: 60 },
  { id: "knee_l", x: 40, y: 75 },
  { id: "knee_r", x: 60, y: 75 },
  { id: "mcp_l_1", x: 10, y: 65 },
  { id: "mcp_l_2", x: 12, y: 68 },
  { id: "mcp_l_3", x: 14, y: 70 },
  { id: "mcp_l_4", x: 16, y: 72 },
  { id: "mcp_l_5", x: 18, y: 74 },
  { id: "pip_l_1", x: 5, y: 68 },
  { id: "pip_l_2", x: 7, y: 71 },
  { id: "pip_l_3", x: 9, y: 73 },
  { id: "pip_l_4", x: 11, y: 75 },
  { id: "pip_l_5", x: 13, y: 77 },
  { id: "mcp_r_1", x: 90, y: 65 },
  { id: "mcp_r_2", x: 88, y: 68 },
  { id: "mcp_r_3", x: 86, y: 70 },
  { id: "mcp_r_4", x: 84, y: 72 },
  { id: "mcp_r_5", x: 82, y: 74 },
  { id: "pip_r_1", x: 95, y: 68 },
  { id: "pip_r_2", x: 93, y: 71 },
  { id: "pip_r_3", x: 91, y: 73 },
  { id: "pip_r_4", x: 89, y: 75 },
  { id: "pip_r_5", x: 87, y: 77 },
];

interface JointMapProps {
  tenderJoints: string[];
  swollenJoints: string[];
  onToggleJoint: (id: string, type: "tender" | "swollen") => void;
}

export function JointMap({ tenderJoints, swollenJoints, onToggleJoint }: JointMapProps) {
  const { t } = useTranslation();

  return (
    <div className="relative w-full max-w-md mx-auto aspect-3/4 bg-blue-50/50 rounded-xl border border-blue-100 overflow-hidden">
      {/* Abstract body silhouette */}
      <svg className="absolute inset-0 w-full h-full text-blue-200/50" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M50 5 C45 5, 42 8, 42 12 C42 16, 45 19, 50 19 C55 19, 58 16, 58 12 C58 8, 55 5, 50 5 Z M35 20 C25 20, 20 25, 20 35 L15 60 L25 60 L30 40 L40 40 L40 95 L48 95 L48 50 L52 50 L52 95 L60 95 L60 40 L70 40 L75 60 L85 60 L80 35 C80 25, 75 20, 65 20 Z"
          fill="currentColor"
        />
      </svg>

      {/* Joints */}
      {joints.map((joint) => {
        const isTender = tenderJoints.includes(joint.id);
        const isSwollen = swollenJoints.includes(joint.id);
        const jointName = t(`joints.names.${joint.id}`);

        let bgColor = "bg-white";
        if (isTender && isSwollen) bgColor = "bg-purple-500";
        else if (isTender) bgColor = "bg-red-500";
        else if (isSwollen) bgColor = "bg-blue-500";

        return (
          <div
            key={joint.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${joint.x}%`, top: `${joint.y}%` }}
          >
            <button
              type="button"
              className={cn(
                "w-4 h-4 rounded-full border-2 border-gray-300 shadow-sm transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-400",
                bgColor,
                (isTender || isSwollen) && "border-transparent"
              )}
              onClick={(e) => {
                e.preventDefault();
                if (!isTender && !isSwollen) {
                  onToggleJoint(joint.id, "tender");
                } else if (isTender && !isSwollen) {
                  onToggleJoint(joint.id, "tender");
                  onToggleJoint(joint.id, "swollen");
                } else if (!isTender && isSwollen) {
                  onToggleJoint(joint.id, "tender");
                } else {
                  onToggleJoint(joint.id, "tender");
                  onToggleJoint(joint.id, "swollen");
                }
              }}
              title={jointName}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-max bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none">
              {jointName}
              <div className="text-[10px] text-gray-300 mt-0.5">
                {t("joints.tooltipCycle")}
              </div>
            </div>
          </div>
        );
      })}

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div> {t("joints.tender")}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div> {t("joints.swollen")}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div> {t("joints.both")}
        </div>
      </div>
    </div>
  );
}
