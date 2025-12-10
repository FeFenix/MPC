import React, { useEffect, useState } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import {
  Box,
  Paper,
  Typography,
  Slider,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { LandscapeCalculatorState, Feature, generateFreshState } from '../types/LandscapeTypes';
import { MAP_SIZE_CONFIG, FEATURES_CONFIG, CUSTOM_FEATURE_DEFAULT } from '../config/calculatorConfig';

// Constants per user's specification
const SIZE_THRESHOLD = 15000;
const T_MIN = 5; // days
const T_PER_MILLION = 0.21; // days per million blocks

// Compute pricing based on area
const computeFromSize = (width: number, length: number) => {
  const area = width * length;
  const A = area / 1_000_000;
  const derivedSize = Math.sqrt(area);
  const rawPbase = 26.58 * Math.pow(Math.max(A, 0), 0.414);
  const adjustedPbase = derivedSize >= SIZE_THRESHOLD ? rawPbase * 1.96 : rawPbase;
  const basePrice = Math.round(adjustedPbase);
  const recommendedDays = Math.max(T_MIN, Math.round(A * T_PER_MILLION));
  return { area, A, derivedSize, rawPbase, adjustedPbase, basePrice, recommendedDays };
};

// Update pricing and state after feature changes
const updatePricing = (s: LandscapeCalculatorState) => {
  const { width, length } = s.size;
  const pricing = computeFromSize(width, length);
  let totalPrice = pricing.basePrice;

  const addFeatureCost = (f?: Feature) => (f && f.enabled ? f.pricePerUnit * f.quantity : 0);

  // Sum all regular features
  Object.entries(s.features).forEach(([k, f]) => {
    if (k === 'structures' || k === 'customFeature') return;
    totalPrice += addFeatureCost(f as Feature);
  });

  // Sum structure features
  Object.entries(s.features.structures).forEach(([, f]) => {
    totalPrice += addFeatureCost(f);
  });

  // Add custom feature cost
  if (s.features.customFeature) totalPrice += addFeatureCost(s.features.customFeature);

  return {
    ...s,
    basePrice: pricing.basePrice,
    recommendedDays: pricing.recommendedDays,
    totalPrice: Math.max(0, Math.round(totalPrice)),
    totalDays: pricing.recommendedDays,
    area: pricing.area,
  } as LandscapeCalculatorState;
};

export const LandscapeCalculator: React.FC = () => {
  const [state, setState] = useState<LandscapeCalculatorState>(() =>
    updatePricing(generateFreshState())
  );

  const [tempInputs, setTempInputs] = useState<{ width: string; length: string }>({
    width: state.size.width.toString(),
    length: state.size.length.toString(),
  });

  // Initialize fresh state on mount
  useEffect(() => {
    const freshState = generateFreshState();
    setState(updatePricing(freshState));
    localStorage.removeItem('landscapeCalculator');
  }, []);

  // Sync temp inputs with state
  useEffect(() => {
    setTempInputs({
      width: state.size.width.toString(),
      length: state.size.length.toString(),
    });
  }, [state.size.width, state.size.length]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('landscapeCalculator', JSON.stringify(state));
  }, [state]);

  const handleSliderChange =
    (field: 'width' | 'length') =>
    (event: Event, value: number | number[]) => {
      const finalValue = value as number;
      const newState = {
        ...state,
        size: { ...state.size, [field]: finalValue },
      };
      setState(updatePricing(newState));
    };

  const handleManualSizeChange =
    (field: 'width' | 'length') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTempInputs((prev: { width: string; length: string }) => ({ ...prev, [field]: event.target.value }));
    };

  const handleManualSizeBlur =
    (field: 'width' | 'length') =>
    (event: React.FocusEvent<HTMLInputElement>) => {
      const numValue = Number(tempInputs[field]);
      let clamped = numValue;

      if (isNaN(numValue) || numValue < MAP_SIZE_CONFIG.min) {
        clamped = MAP_SIZE_CONFIG.min;
      } else if (numValue > MAP_SIZE_CONFIG.max) {
        clamped = MAP_SIZE_CONFIG.max;
      }

      const newState = {
        ...state,
        size: { ...state.size, [field]: clamped },
      };
      setState(updatePricing(newState));
    };

  const handleFeatureChange =
    (path: string[], field: 'enabled' | 'quantity' | 'pricePerUnit' | 'daysPerUnit' | 'name', parser?: (v: string) => any) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let value: any = event.target.value;

      if (field === 'enabled') {
        value = (event.target as HTMLInputElement).checked;
      } else if (parser) {
        value = parser(value);
      }

      const newState = JSON.parse(JSON.stringify(state));
      let obj = newState.features;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]];
      }
      obj[path[path.length - 1]][field] = value;

      setState(updatePricing(newState));
    };

  const renderFeatureRow = (
    label: string,
    feature: Feature | undefined,
    path: string[]
  ) => {
    if (!feature) return null;

    return (
      <TableRow key={label}>
        <TableCell sx={{ py: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={feature.enabled}
                onChange={handleFeatureChange(path, 'enabled')}
                size="small"
              />
            }
            label={<Typography variant="body2">{label}</Typography>}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.quantity}
            onChange={handleFeatureChange(path, 'quantity', (v) => Math.max(1, parseInt(v) || 0))}
            disabled={!feature.enabled}
            inputProps={{ min: 1 }}
            size="small"
            sx={{ width: 60 }}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.pricePerUnit}
            onChange={handleFeatureChange(path, 'pricePerUnit', (v) => Math.max(0, parseFloat(v) || 0))}
            inputProps={{ min: 0, step: 0.01 }}
            size="small"
            sx={{ width: 80 }}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.daysPerUnit}
            onChange={handleFeatureChange(path, 'daysPerUnit', (v) => Math.max(0, parseInt(v) || 0))}
            inputProps={{ min: 0 }}
            size="small"
            sx={{ width: 60 }}
          />
        </TableCell>
      </TableRow>
    );
  };

  // Derived values
  const rectArea = state.size.width * state.size.length;
  const derivedSize = Math.sqrt(rectArea);
  const A = rectArea / 1_000_000;
  const rawPbase = 26.58 * Math.pow(Math.max(A, 0), 0.414);
  const PbaseAdjusted = derivedSize >= SIZE_THRESHOLD ? rawPbase * 1.96 : rawPbase;
  const formatNumber = (n: number, digits = 2) =>
    Number.isFinite(n) ? n.toFixed(digits) : 'N/A';

  const texFormula = `P_{base} = 26.58\\cdot A^{0.414}`;
  const texA = `A = \\dfrac{size^{2}}{10^{6}} = \\dfrac{${derivedSize.toFixed(0)}^{2}}{10^{6}} = ${A.toFixed(3)}`;

  const getEnabledFeatures = () => {
    const features: { name: string; price: number }[] = [];

    Object.entries(state.features).forEach(([key, f]) => {
      if (key === 'structures' || key === 'customFeature' || !f) return;
      const feat = f as Feature;
      if (feat.enabled) {
        features.push({
          name: key,
          price: feat.pricePerUnit * feat.quantity,
        });
      }
    });

    Object.entries(state.features.structures).forEach(([key, f]) => {
      if (f && (f as Feature).enabled) {
        features.push({ name: key, price: (f as Feature).pricePerUnit * (f as Feature).quantity });
      }
    });

    if (state.features.customFeature && state.features.customFeature.enabled) {
      features.push({
        name: state.features.customFeature.name || 'Custom',
        price: state.features.customFeature.pricePerUnit * state.features.customFeature.quantity,
      });
    }

    return features;
  };

  const handleClear = () => {
    const freshState = generateFreshState();
    setState(updatePricing(freshState));
    localStorage.removeItem('landscapeCalculator');
  };

  const handleConfirmOrder = () => {
    const summary = [
      '=== Minecraft Map Order ===',
      `Size: ${state.size.width}x${state.size.length} blocks`,
      `Total Price: $${state.totalPrice}`,
      `Delivery Time: ${state.totalDays} days`,
      ...getEnabledFeatures().map((f) => `${f.name}: $${f.price}`),
    ].join('\n');

    navigator.clipboard.writeText(summary);
    alert('Order summary copied to clipboard!');
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Minecraft Landscape Map Calculator
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Map Size Section */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Map Size
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Width: {state.size.width} blocks
              </Typography>
              <TextField
                type="number"
                value={tempInputs.width}
                onChange={handleManualSizeChange('width')}
                onBlur={handleManualSizeBlur('width')}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
              <Slider
                value={state.size.width}
                onChange={handleSliderChange('width')}
                min={MAP_SIZE_CONFIG.min}
                max={MAP_SIZE_CONFIG.max}
                step={100}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Length: {state.size.length} blocks
              </Typography>
              <TextField
                type="number"
                value={tempInputs.length}
                onChange={handleManualSizeChange('length')}
                onBlur={handleManualSizeBlur('length')}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
              <Slider
                value={state.size.length}
                onChange={handleSliderChange('length')}
                min={MAP_SIZE_CONFIG.min}
                max={MAP_SIZE_CONFIG.max}
                step={100}
                valueLabelDisplay="auto"
              />
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2">
              Area: {(rectArea / 1_000_000).toFixed(2)}M blocks
            </Typography>
            <Typography variant="body2">
              Recommended days: {state.recommendedDays}
            </Typography>
          </Paper>
        </Grid>

        {/* Formula Section */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, bgcolor: '#f9f9f9' }}>
            <Typography variant="h6" gutterBottom>
              Pricing Formula
            </Typography>
            <Box sx={{ mb: 2 }}>
              <BlockMath math={texFormula} />
              <BlockMath math={texA} />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2">
              Base Price: ${state.basePrice}
            </Typography>
            <Typography variant="body2">
              Total Price: ${state.totalPrice}
            </Typography>
          </Paper>
        </Grid>

        {/* Features Table */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Additional Features
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price/unit</TableCell>
                    <TableCell align="right">Days/unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(state.features).map(([key, feature]) => {
                    if (key === 'structures' || key === 'customFeature') return null;
                    return renderFeatureRow(key, feature as Feature, ['features', key]);
                  })}

                  {Object.entries(state.features.structures).map(([key, feature]) =>
                    renderFeatureRow(key, feature as Feature, ['features', 'structures', key])
                  )}

                  {renderFeatureRow(
                    'Custom Feature',
                    state.features.customFeature,
                    ['features', 'customFeature']
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Summary Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              bgcolor: '#1976d2',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h5" align="center" gutterBottom>
              Total
            </Typography>
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <Typography variant="h4">${state.totalPrice}</Typography>
              <Typography variant="h6">{state.totalDays} days</Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />

            {getEnabledFeatures().length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Features:
                </Typography>
                <Box sx={{ mb: 2, pl: 1 }}>
                  {getEnabledFeatures().map((f, i) => (
                    <Typography key={i} variant="caption" display="block">
                      {f.name}: ${f.price}
                    </Typography>
                  ))}
                </Box>
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
              </>
            )}

            <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
              <Button
                variant="contained"
                color="error"
                fullWidth
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                sx={{ bgcolor: '#4caf50' }}
                fullWidth
                onClick={handleConfirmOrder}
              >
                Confirm
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}; 