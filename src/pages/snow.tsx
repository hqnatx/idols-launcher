import { Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { useUserControl } from "src/state/user";

import client from "src/external/client";
const Snow = () => {
  const navigate = useNavigate();
  const user = useUserControl();

  useEffect(() => {
    const token = user.access_token?.trim();
    if (!token) {
      navigate({ to: "/credentials" });
      return;
    }

    const asyncMethod = async () => {
      if (sessionStorage.getItem("idols.auth.discordOnly") === "1") {
        return;
      }
      const response = await client.okay(token);
      if (response.ok) return;
      user.kill_token();
      sessionStorage.removeItem("idols.auth.discordOnly");
      navigate({ to: "/credentials" });
    };

    asyncMethod();
  }, []);

  return (
    <div className="snowPage">
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  );
};

export default Snow;
