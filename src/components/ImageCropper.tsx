import React, { useState, useRef } from "react";

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
  convertToPixelCrop,
} from "react-image-crop";
import { canvasPreview } from "./canvasPreview";
import { useDebounceEffect } from "../utils/useDebounceEffect";

import "react-image-crop/dist/ReactCrop.css";
import {
  Button,
  FormControlLabel,
  Grid,
  IconButton,
  Input,
  Slider,
  Switch,
  Typography,
} from "@mui/material";

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageCropper() {
  const [imgSrc, setImgSrc] = useState("");
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hiddenAnchorRef = useRef<HTMLAnchorElement>(null);
  const blobUrlRef = useRef("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(16 / 9);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        setImgSrc(reader.result?.toString() || "")
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }

  function onDownloadCropClick() {
    if (!previewCanvasRef.current) {
      throw new Error("Crop canvas does not exist");
    }

    previewCanvasRef.current.toBlob((blob) => {
      if (!blob) {
        throw new Error("Failed to create blob");
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = URL.createObjectURL(blob);
      hiddenAnchorRef.current!.href = blobUrlRef.current;
      hiddenAnchorRef.current!.click();
    });
  }

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        // We use canvasPreview as it's much faster than imgPreview.
        canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
          scale,
          rotate
        );
      }
    },
    100,
    [completedCrop, scale, rotate]
  );

  function handleToggleAspectClick() {
    console.log("handleToggleAspectClick", aspect);

    if (aspect) {
      setAspect(undefined);
    } else if (imgRef.current) {
      const { width, height } = imgRef.current;
      setAspect(16 / 9);
      const newCrop = centerAspectCrop(width, height, 16 / 9);
      setCrop(newCrop);
      // Updates the preview
      setCompletedCrop(convertToPixelCrop(newCrop, width, height));
    }
  }

  return (
    <Grid
      container
      spacing={3}
      sx={{ background: "grey", alignItems: "center", padding: "20px" }}
    >
      <Grid item xs={12}>
        <input type="file" accept="image/*" onChange={onSelectFile} />
      </Grid>
      <Grid item xs={4}>
        <Grid container spacing={3} sx={{ alignItems: "flex-end" }}>
          <Grid item xs={4}>
            <Typography id="scale-input" gutterBottom>
              Scale: {scale}
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <Button
              onClick={() => setScale(1)}
              variant="contained"
              disabled={!imgSrc}
            >
              Reset Scale
            </Button>
          </Grid>
        </Grid>
        <Slider
          value={scale}
          onChange={(_, value) => setScale(value as number)}
          min={0.1}
          max={10}
          step={0.1}
          disabled={!imgSrc}
        />
      </Grid>
      <Grid item xs={4}>
        <Grid container spacing={3} sx={{ alignItems: "flex-end" }}>
          <Grid item xs={4}>
            <Typography id="scale-input" gutterBottom>
              Rotate: {rotate}
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <Button
              onClick={() => setScale(1)}
              variant="contained"
              disabled={!imgSrc}
            >
              Reset Rotate
            </Button>
          </Grid>
        </Grid>
        <Slider
          value={rotate}
          onChange={(_, value) =>
            setRotate(Math.min(180, Math.max(-180, value as number)))
          }
          min={-180}
          max={180}
          step={1}
          disabled={!imgSrc}
        />
      </Grid>

      <Grid item xs={4}>
        <FormControlLabel
          control={
            <Switch
              checked={!!aspect}
              onChange={handleToggleAspectClick}
              name="checkedB"
              color="primary"
            />
          }
          label={`Keep Aspect Ratio 16/9`}
          disabled={!imgSrc}
          labelPlacement="start"
        />
      </Grid>

      <Grid
        container
        spacing={3}
        sx={{
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "20px",
        }}
      >
        {!!imgSrc && (
          <Grid
            item
            xs={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRight: "1px solid black",
            }}
          >
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              style={{ maxHeight: "70vh", alignItems: "center" }}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </Grid>
        )}

        {!!completedCrop && (
          <Grid
            item
            xs={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div>
              <canvas
                ref={previewCanvasRef}
                style={{
                  border: "1px solid black",
                  objectFit: "contain",
                  width: completedCrop.width,
                  height: completedCrop.height,
                }}
              />
            </div>
          </Grid>
        )}
        {!!completedCrop && (
          <Grid item xs={12} sx={{ display: "flex", justifyContent: "center" }}>
            <div>
              <Button onClick={onDownloadCropClick} variant="contained">
                Download Crop
              </Button>
              <a
                ref={hiddenAnchorRef}
                download
                style={{
                  position: "absolute",
                  top: "-200vh",
                  visibility: "hidden",
                }}
              >
                Hidden download
              </a>
            </div>
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}
