import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";

interface PresenceUser {
  wallet_address: string;
  online_at: string;
}

export function PresenceIndicator() {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser[]>>(new Map());
  const { walletAddress } = useWeb3();

  useEffect(() => {
    if (!walletAddress) return;

    const channel = supabase.channel("research-app");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        setOnlineUsers(new Map(Object.entries(state)));
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            wallet_address: walletAddress,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [walletAddress]);

  const allUsers = Array.from(onlineUsers.values()).flat();
  const uniqueUsers = Array.from(
    new Map(allUsers.map((user) => [user.wallet_address, user])).values()
  );
  const otherUsers = uniqueUsers.filter((u) => u.wallet_address !== walletAddress);

  if (!walletAddress || otherUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {otherUsers.length} {otherUsers.length === 1 ? "user" : "users"} online
      </span>
      <div className="flex -space-x-2">
        {otherUsers.slice(0, 3).map((user, idx) => (
          <Avatar key={user.wallet_address} className="h-6 w-6 border-2 border-background">
            <AvatarFallback className="text-xs bg-primary/10">
              {user.wallet_address.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {otherUsers.length > 3 && (
          <Badge variant="secondary" className="h-6 text-xs">
            +{otherUsers.length - 3}
          </Badge>
        )}
      </div>
    </div>
  );
}
