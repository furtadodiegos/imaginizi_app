"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

import type { FC } from "react";

export const HeroBanner: FC = () => {
  return (
    <div className="from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[1.2fr,1fr]">
        <Card className="shadow-lg border-border/60">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">
              Nano Banana Clone 🍌
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-lg border-border/60">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">
              Nano Banana Clone 🍌
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};
