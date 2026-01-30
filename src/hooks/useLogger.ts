import { supabaseClient } from "../utility/supabaseClient";

export const useLogger = () => {
  const logAction = async (
    action: "CREATE" | "UPDATE" | "DELETE",
    resource: string,
    targetId: string | number,
    previousData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (!user?.id) {
        console.warn("Audit Log: No authenticated user found.");
        return;
      }

      const { error } = await supabaseClient.from("audit_logs").insert({
        operator_id: user.id,
        action,
        resource,
        target_id: String(targetId),
        previous_data: previousData,
        new_data: newData,
      });

      if (error) {
        console.error("Audit Log: Failed to insert record.", error);
      }
    } catch (error) {
      console.error("Audit Log: Unexpected error.", error);
    }
  };

  return { logAction };
};
