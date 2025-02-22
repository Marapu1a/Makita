import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  fetchSlidesByModel,
  fetchModelById,
  fetchPartsByModel,
} from "../utils/api";
import PartsTable from "../components/PartsTable";

type Slide = {
  id: number;
  slide_number: number;
  image_width: number;
  image_height: number;
  Parts?: Part[];
};

type Part = {
  id: number;
  number: number;
  name: string | null;
  part_number: string;
  price: number;
  slide_id: number | null;
  x_coord?: number;
  y_coord?: number;
  width?: number;
  height?: number;
};

type Model = {
  id: string;
  name: string;
  category_name: string;
};

const UnifiedModelDetails = () => {};

export default UnifiedModelDetails;
