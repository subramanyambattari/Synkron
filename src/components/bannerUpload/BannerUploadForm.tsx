"use client";
import {
  appFoldersType,
  appWorkspacesType,
  useAppState,
} from "@/lib/providers/state-provider";
import { Folder, workspace } from "@/lib/supabase/supabase.types";
import { UploadBannerFormSchema } from "@/lib/types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  updateFile,
  updateFolder,
  updateWorkspace,
} from "@/lib/supabase/queries";
import { Loader } from "lucide-react";

interface BannerUploadFormProps {
  dirType: "workspace" | "file" | "folder";
  id: string;
}

const BannerUploadForm: React.FC<BannerUploadFormProps> = ({ dirType, id }) => {
  const supabase = createClientComponentClient();
  const { state, workspaceId, folderId, dispatch } = useAppState();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting: isUploading, errors },
  } = useForm<z.infer<typeof UploadBannerFormSchema>>({
    mode: "onChange",
    defaultValues: {
      banner: "",
    },
  });
  const onSubmitHandler: SubmitHandler<
    z.infer<typeof UploadBannerFormSchema>
  > = async (values) => {
    setUploadError(null);
    const file = values.banner?.[0];
    if (!file) {
      setUploadError("No file found in form values.");
      return;
    }
    if (!id) {
      setUploadError("No ID provided for directory.");
      return;
    }
    
    try {
      let filePath = null;

      const uploadBanner = async () => {
        let oldPath = "";
        if (dirType === "workspace") {
          oldPath = state.workspaces.find((w) => w.id === id)?.bannerUrl || "";
        } else if (dirType === "folder") {
          const workspace = state.workspaces.find((w) => w.id === workspaceId);
          oldPath = workspace?.folders.find((f) => f.id === id)?.bannerUrl || "";
        } else if (dirType === "file") {
          const workspace = state.workspaces.find((w) => w.id === workspaceId);
          const folder = workspace?.folders.find((f) => f.id === folderId);
          oldPath = folder?.files.find((f) => f.id === id)?.bannerUrl || "";
        }

        if (oldPath) {
          await supabase.storage.from("file-banners").remove([oldPath]);
        }
        
        const newPath = `banner-${id}-${Date.now()}`;
        const { data, error } = await supabase.storage
          .from("file-banners")
          .upload(newPath, file, { cacheControl: "5", upsert: true });
        if (error) {
          setUploadError(error.message || "Failed to upload to Supabase storage");
          throw new Error(error.message);
        }
        filePath = data.path;
      };
      
      if (dirType === "file") {
        if (!workspaceId || !folderId) {
          setUploadError("Missing workspaceId or folderId for file.");
          return;
        }
        await uploadBanner();
        dispatch({
          type: "UPDATE_FILE",
          payload: {
            file: { bannerUrl: filePath },
            fileId: id,
            folderId,
            workspaceId,
          },
        });
        await updateFile({ bannerUrl: filePath }, id);
      } else if (dirType === "folder") {
        if (!workspaceId || !folderId) {
          setUploadError("Missing workspaceId or folderId for folder.");
          return;
        }
        await uploadBanner();
        dispatch({
          type: "UPDATE_FOLDER",
          payload: {
            folderId: id,
            folder: { bannerUrl: filePath },
            workspaceId,
          },
        });
        await updateFolder({ bannerUrl: filePath }, id);
      } else if (dirType === "workspace") {
        await uploadBanner();
        dispatch({
          type: "UPDATE_WORKSPACE",
          payload: {
            workspace: { bannerUrl: filePath },
            workspaceId: id,
          },
        });
        await updateWorkspace({ bannerUrl: filePath }, id);
      }
      
      // If success, we should probably reset or at least clear error
      setUploadError("Success! Please close the modal.");
    } catch (error: any) {
      setUploadError(error.message || "An unexpected error occurred");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmitHandler)}
      className="flex flex-col gap-2"
    >
      <Label className="text-sm text-muted-foreground" htmlFor="bannerImage">
        Banner Image
      </Label>
      <Input
        id="bannerImage"
        type="file"
        accept="image/*"
        disabled={isUploading}
        {...register("banner", { 
          required: "Banner Image is required",
          onChange: handleFileChange 
        })}
      />
      {imagePreview && (
        <img
          src={imagePreview}
          alt="Image Preview"
          style={{ maxWidth: "100%", maxHeight: "230px", objectFit: "cover" }}
        />
      )}
      <small className="text-red-600">
        {errors.banner?.message?.toString()}
      </small>
      {uploadError && (
        <small className={uploadError.includes("Success") ? "text-green-600" : "text-red-600"}>
          {uploadError}
        </small>
      )}
      <Button disabled={isUploading} type="submit">
        Upload Banner
        {!isUploading ? null : <Loader className="h-4 w-4 animate-spin ml-2" />}
      </Button>
    </form>
  );
};

export default BannerUploadForm;
