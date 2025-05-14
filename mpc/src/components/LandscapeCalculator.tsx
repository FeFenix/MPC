import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  Checkbox,
  FormControlLabel,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Grid,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import { LandscapeCalculatorState, DEFAULT_STATE, Feature, generateFreshState } from '../types/LandscapeTypes';
import emailjs from '@emailjs/browser';
import {
  PRICE_PER_DAY_ADJUSTMENT,
  MINIMUM_TOTAL_PRICE,
  MAP_SIZE_CONFIG,
  DELIVERY_CONFIG,
  FEATURES_CONFIG,
  CUSTOM_FEATURE_DEFAULT
} from '../config/calculatorConfig';

// Initialize EmailJS with public key
emailjs.init({
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '',
  blockHeadless: false, // This allows the code to work in test environments
});

// Update the verifyEmailJSInit function
const verifyEmailJSInit = () => {
  try {
    emailjs.init({
      publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '',
      blockHeadless: false,
    });
    console.log("EmailJS initialized successfully");
  } catch (error) {
    console.error("EmailJS initialization error:", error);
  }
};

const calculatePricing = (width: number, length: number, deliveryDays: number) => {
  const area = width * length;
  const areaInMillions = area / 1000000;
  
  // Calculate base price based on total area points
  let basePrice;
  
  if (area <= 250000) { // Up to 500x500
    basePrice = MINIMUM_TOTAL_PRICE;
  } else if (area <= 25000000) { // Up to 5000x5000
    const t = (area - 250000) / (25000000 - 250000);
    basePrice = MINIMUM_TOTAL_PRICE + (165 - MINIMUM_TOTAL_PRICE) * t;
  } else if (area <= 100000000) { // Up to 10000x10000
    const t = (area - 25000000) / (100000000 - 25000000);
    basePrice = 165 + (280 - 165) * t;
  } else { // Up to 35000x35000
    const t = (area - 100000000) / (1225000000 - 100000000);
    basePrice = 280 + (780 - 280) * t;
  }
  
  // Calculate recommended days based on area points
  let recommendedDays;
  
  if (area <= 250000) {
    recommendedDays = DELIVERY_CONFIG.defaultDays;
  } else if (area <= 25000000) {
    const t = (area - 250000) / (25000000 - 250000);
    recommendedDays = Math.round(DELIVERY_CONFIG.defaultDays + (14 - DELIVERY_CONFIG.defaultDays) * t);
  } else if (area <= 100000000) {
    const t = (area - 25000000) / (100000000 - 25000000);
    recommendedDays = Math.round(14 + (21 - 14) * t);
  } else {
    const t = (area - 100000000) / (1225000000 - 100000000);
    recommendedDays = Math.round(21 + (37 - 21) * t);
  }
  
  // Adjust price based on delivery time
  const daysDiff = recommendedDays - deliveryDays;
  const priceAdjustment = daysDiff * PRICE_PER_DAY_ADJUSTMENT;
  
  // Apply price adjustment but ensure minimum price
  let finalPrice = Math.max(MINIMUM_TOTAL_PRICE, Math.round(basePrice + priceAdjustment));
  
  return {
    basePrice: Math.round(basePrice),
    recommendedDays,
    totalPrice: finalPrice,
    area
  };
};

const updatePricing = (newState: LandscapeCalculatorState) => {
  const { width, length, deliveryDays } = newState.size;
  const pricing = calculatePricing(width, length, deliveryDays);
  
  let totalPrice = pricing.basePrice;
  let additionalDays = 0;

  // Add feature costs
  const addFeatureCost = (feature: Feature) => {
    if (feature && feature.enabled) {
      totalPrice += feature.pricePerUnit * feature.quantity;
      additionalDays += feature.daysPerUnit * feature.quantity;
    }
  };

  // Process regular features
  Object.entries(newState.features).forEach(([key, feature]) => {
    if (key !== 'structures' && key !== 'customFeature' && feature) {
      const f = feature as Feature;
      addFeatureCost(f);
    }
  });

  // Process structures separately
  if (newState.features.structures) {
    Object.entries(newState.features.structures).forEach(([key, feature]) => {
      if (feature) {
        addFeatureCost(feature);
      }
    });
  }

  // Add custom feature if enabled
  const customFeature = newState.features.customFeature;
  if (customFeature) {
    addFeatureCost(customFeature);
  }

  // Calculate total recommended days including feature days
  const totalRecommendedDays = pricing.recommendedDays + additionalDays;
  
  // Calculate total days including user-specified delivery days
  const totalDays = deliveryDays + additionalDays;

  // Adjust price based on delivery time difference
  const daysDiff = totalRecommendedDays - totalDays;
  const priceAdjustment = daysDiff * PRICE_PER_DAY_ADJUSTMENT;
  totalPrice += priceAdjustment;

  return { 
    ...newState,
    basePrice: pricing.basePrice,
    recommendedDays: totalRecommendedDays,
    totalPrice: Math.max(MINIMUM_TOTAL_PRICE, totalPrice), // Ensure minimum price of $30
    totalDays,
    area: pricing.area
  };
};

let orderNumber = 1;

const formatOrderNumber = (num: number): string => {
  return `#${String(num).padStart(6, '0')}`;
};

export const LandscapeCalculator: React.FC = () => {
  const [state, setState] = useState<LandscapeCalculatorState>(() => {
    // Force fresh config values on initial load
    const freshState = generateFreshState();
    console.log('Initial state generated:', freshState);
    return updatePricing(freshState);
  });

  // Add useEffect to refresh config values when component mounts
  useEffect(() => {
    const freshState = generateFreshState();
    console.log('Config refreshed on mount:', freshState);
    setState(updatePricing(freshState));
    localStorage.removeItem('landscapeCalculator'); // Clear any stored state
  }, []); // Run only on mount

  // Add state for temporary input values
  const [tempInputs, setTempInputs] = useState({
    width: state.size.width.toString(),
    length: state.size.length.toString()
  });

  // Update temp inputs when state changes
  useEffect(() => {
    setTempInputs({
      width: state.size.width.toString(),
      length: state.size.length.toString()
    });
  }, [state.size.width, state.size.length]);

  // Add useEffect to verify initialization when component mounts
  useEffect(() => {
    verifyEmailJSInit();
  }, []);

  useEffect(() => {
    localStorage.setItem('landscapeCalculator', JSON.stringify(state));
  }, [state]);

  const snapPoints = MAP_SIZE_CONFIG.snapPoints;
  const snapThreshold = MAP_SIZE_CONFIG.snapThreshold;

  const handleSizeChange = (field: 'width' | 'length' | 'deliveryDays') => (event: Event, value: number | number[]) => {
    let finalValue = value as number;
    
    // Apply snapping only for width and length
    if (field !== 'deliveryDays') {
      // Find the closest snap point if we're within the threshold
      const closestPoint = snapPoints.find(point => 
        Math.abs(point - finalValue) < snapThreshold
      );
      if (closestPoint) {
        finalValue = closestPoint;
      }
    }

    const newState = {
      ...state,
      size: {
        ...state.size,
        [field]: finalValue,
      },
    };

    // If width or length changed, update delivery days to recommended
    if (field !== 'deliveryDays') {
      const updatedWidth = field === 'width' ? finalValue : state.size.width;
      const updatedLength = field === 'length' ? finalValue : state.size.length;
      const pricing = calculatePricing(updatedWidth, updatedLength, state.size.deliveryDays);
      newState.size.deliveryDays = pricing.recommendedDays;
    }

    setState(updatePricing(newState));
  };

  const handleManualSizeChange = (field: 'width' | 'length') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    setTempInputs(prev => ({
      ...prev,
      [field]: newValue
    }));

    if (newValue === '' || isNaN(Number(newValue))) {
      return;
    }

    const numValue = Number(newValue);
    
    if (!isNaN(numValue)) {
      const finalValue = Math.min(MAP_SIZE_CONFIG.max, Math.max(MAP_SIZE_CONFIG.min, numValue));
      
      if (finalValue !== state.size[field]) {
        const newState = {
          ...state,
          size: {
            ...state.size,
            [field]: finalValue,
          },
        };
        setState(updatePricing(newState));
      }
    }
  };

  const handleInputBlur = (field: 'width' | 'length') => () => {
    const numValue = Number(tempInputs[field]);
    if (isNaN(numValue) || numValue < MAP_SIZE_CONFIG.min) {
      const newState = {
        ...state,
        size: {
          ...state.size,
          [field]: MAP_SIZE_CONFIG.min,
        },
      };
      setState(updatePricing(newState));
    } else if (numValue > MAP_SIZE_CONFIG.max) {
      const newState = {
        ...state,
        size: {
          ...state.size,
          [field]: MAP_SIZE_CONFIG.max,
        },
      };
      setState(updatePricing(newState));
    }
  };

  const handleFeatureChange = (
    feature: string,
    isStructure = false,
    field: 'enabled' | 'quantity' | 'pricePerUnit' | 'daysPerUnit' | 'name' = 'enabled'
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let value: string | number | boolean = event.target.value;
    if (field === 'enabled') {
      value = event.target.checked;
    } else if (field !== 'name') {
      value = parseInt(event.target.value) || 0;
    }

    const newState = { ...state };

    if (isStructure) {
      // Handle structure features
      if (feature in newState.features.structures) {
        newState.features.structures[feature as keyof typeof state.features.structures] = {
          ...newState.features.structures[feature as keyof typeof state.features.structures],
          [field]: value
        };
      }
    } else {
      // Handle regular features
      if (feature in newState.features && feature !== 'structures') {
        const featureKey = feature as keyof typeof state.features;
        if (featureKey !== 'structures') {
          newState.features[featureKey] = {
            ...newState.features[featureKey],
            [field]: value
          } as Feature;
        }
      }
    }

    setState(updatePricing(newState));
  };

  const renderFeatureRow = (
    featureKey: string,
    feature: Feature | undefined,
    onChange: (field: 'enabled' | 'quantity' | 'pricePerUnit' | 'daysPerUnit' | 'name') => (event: React.ChangeEvent<HTMLInputElement>) => void,
    isCustom = false
  ) => {
    if (!feature) return null;

    let featureConfig;
    if (isCustom) {
      featureConfig = CUSTOM_FEATURE_DEFAULT;
    } else if (featureKey in FEATURES_CONFIG) {
      if (featureKey === 'structures') {
        // Handle structures differently as they have a nested structure
        return null;
      } else {
        featureConfig = (FEATURES_CONFIG as any)[featureKey];
      }
    }
    
    if (!featureConfig && !isCustom) return null;
    
    return (
      <TableRow>
        <TableCell sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={feature.enabled}
                  onChange={onChange('enabled')}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{isCustom ? (
                    <TextField
                      value={feature.name || ''}
                      onChange={onChange('name')}
                      size="small"
                      placeholder="Custom feature name"
                      sx={{ ml: 1 }}
                    />
                  ) : featureConfig.name}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {isCustom ? feature.description : featureConfig.description}
                  </Typography>
                </Box>
              }
            />
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.quantity}
            onChange={onChange('quantity')}
            disabled={!feature.enabled}
            inputProps={{ min: 1 }}
            size="small"
            sx={{ width: 60 }}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          {isCustom ? (
            <TextField
              type="number"
              value={feature.pricePerUnit}
              onChange={onChange('pricePerUnit')}
              disabled={!feature.enabled}
              inputProps={{ min: 0 }}
              size="small"
              sx={{ width: 80 }}
            />
          ) : (
            <Typography>${featureConfig.pricePerUnit}</Typography>
          )}
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          {isCustom ? (
            <TextField
              type="number"
              value={feature.daysPerUnit}
              onChange={onChange('daysPerUnit')}
              disabled={!feature.enabled}
              inputProps={{ min: 0 }}
              size="small"
              sx={{ width: 60 }}
            />
          ) : (
            <Typography>{featureConfig.daysPerUnit}</Typography>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const formatArea = (area: number) => {
    return (area / 1000000).toFixed(2);
  };

  const getEnabledFeatures = () => {
    const features: { name: string; price: number; days: number }[] = [];
    
    // Process regular features
    Object.entries(state.features).forEach(([key, feature]) => {
      if (key !== 'structures' && key !== 'customFeature' && feature) {
        const f = feature as Feature;
        if (f.enabled) {
          features.push({
            name: key,
            price: f.pricePerUnit * f.quantity,
            days: f.daysPerUnit * f.quantity
          });
        }
      }
    });

    // Process structures separately
    if (state.features.structures) {
      Object.entries(state.features.structures).forEach(([key, feature]) => {
        if (feature && feature.enabled) {
          features.push({
            name: key,
            price: feature.pricePerUnit * feature.quantity,
            days: feature.daysPerUnit * feature.quantity
          });
        }
      });
    }

    // Process custom feature
    const customFeature = state.features.customFeature;
    if (customFeature && customFeature.enabled) {
      features.push({
        name: customFeature.name || 'Custom Feature',
        price: customFeature.pricePerUnit * customFeature.quantity,
        days: customFeature.daysPerUnit * customFeature.quantity
      });
    }

    return features;
  };

  const handleClear = (): void => {
    // Create a fresh state using the latest config values
    const freshState = generateFreshState();
    setState(updatePricing(freshState));
    setTempInputs({
      width: String(freshState.size.width),
      length: String(freshState.size.length)
    });
    
    // Clear localStorage to ensure we don't load old values next time
    localStorage.removeItem('landscapeCalculator');
  };

  const handleConfirmOrder = async (): Promise<void> => {
    try {
      // Verify initialization before sending
      verifyEmailJSInit();
      
      const orderNum = formatOrderNumber(orderNumber);
      
      // Format order details as text
      const orderDetails = [
        '=== Minecraft Map Order ===',
        `Order Number: ${orderNum}`,
        '',
        '=== Map Details ===',
        `Size: ${state.size.width}x${state.size.length} blocks`,
        `Total Area: ${formatArea(state.area)} million blocks`,
        `Delivery Time: ${state.totalDays} days`,
        `Base Price: $${state.basePrice}`,
        '',
        '=== Additional Features ===',
        ...getEnabledFeatures().map(feature => 
          `${feature.name}: $${feature.price} (${feature.days} days)`
        ),
        '',
        '=== Pricing ===',
        `Total Price: $${state.totalPrice}`,
        '',
        state.totalDays !== state.recommendedDays ? 
          `Note: Delivery time is ${state.totalDays < state.recommendedDays ? 
            `${state.recommendedDays - state.totalDays} days faster (Additional cost: $${Math.abs((state.recommendedDays - state.totalDays) * PRICE_PER_DAY_ADJUSTMENT)})` : 
            `${state.totalDays - state.recommendedDays} days slower (Savings: $${Math.abs((state.totalDays - state.recommendedDays) * PRICE_PER_DAY_ADJUSTMENT)})`
          }` : ''
      ].filter(line => line !== '').join('\n');

      // Prepare email data
      const templateParams = {
        to_email: process.env.REACT_APP_EMAILJS_TO_EMAIL,
        order_number: orderNum,
        order_details: orderDetails,
        map_size: `${state.size.width}x${state.size.length}`,
        total_area: formatArea(state.area),
        delivery_time: state.totalDays,
        total_price: state.totalPrice,
        enabled_features: getEnabledFeatures()
          .map(feature => `${feature.name}: $${feature.price} (${feature.days} days)`)
          .join('\n'),
        name: "Minecraft Map Calculator",
        email: process.env.REACT_APP_EMAILJS_TO_EMAIL
      };

      console.log('Sending email with params:', templateParams);
      
      const result = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '',
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY || ''
      );
      
      console.log('Email result:', result);
      
      if (result.status === 200) {
        orderNumber++;
        alert('Order has been sent successfully!');
      } else {
        throw new Error(`Failed to send email. Status: ${result.status}`);
      }
    } catch (error: any) {
      console.error('Failed to send order. Error details:', error);
      alert(`Failed to send order. Error: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 4, backgroundColor: '#fff' }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
              Minecraft Landscape Map Calculator
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Map Size
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography></Typography>
                      <Typography>Width:</Typography>
                      <Typography></Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          type="number"
                          value={tempInputs.width}
                          onChange={handleManualSizeChange('width')}
                          onBlur={handleInputBlur('width')}
                          onFocus={(e) => e.target.select()}
                          inputProps={{ 
                            min: MAP_SIZE_CONFIG.min, 
                            max: MAP_SIZE_CONFIG.max,
                            style: { textAlign: 'right' }
                          }}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <Typography sx={{ ml: 1 }}>blocks</Typography>
                      </Box>
                    </Box>
                    <Slider
                      value={state.size.width}
                      min={MAP_SIZE_CONFIG.min}
                      max={MAP_SIZE_CONFIG.max}
                      step={100}
                      onChange={handleSizeChange('width')}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 1000, label: '1k' },
                        { value: 5000, label: '5k' },
                        { value: 10000, label: '10k' },
                        { value: 20000, label: '20k' },
                        { value: 25000, label: '25k' },
                      ]}
                      sx={{
                        '& .MuiSlider-mark': {
                          height: 10,
                          width: 2,
                          backgroundColor: '#bfbfbf',
                        },
                        '& .MuiSlider-markActive': {
                          backgroundColor: '#fff',
                        },
                        '& .MuiSlider-mark[data-index="0"], .MuiSlider-mark[data-index="1"], .MuiSlider-mark[data-index="2"], .MuiSlider-mark[data-index="3"], .MuiSlider-mark[data-index="4"]': {
                          height: 16,
                          width: 4,
                          backgroundColor: '#2196f3',
                        },
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2, mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography></Typography>
                      <Typography>Length:</Typography>
                      <Typography></Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          type="number"
                          value={tempInputs.length}
                          onChange={handleManualSizeChange('length')}
                          onBlur={handleInputBlur('length')}
                          onFocus={(e) => e.target.select()}
                          inputProps={{ 
                            min: MAP_SIZE_CONFIG.min, 
                            max: MAP_SIZE_CONFIG.max,
                            style: { textAlign: 'right' }
                          }}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <Typography sx={{ ml: 1 }}>blocks</Typography>
                      </Box>
                    </Box>
                    <Slider
                      value={state.size.length}
                      min={MAP_SIZE_CONFIG.min}
                      max={MAP_SIZE_CONFIG.max}
                      step={100}
                      onChange={handleSizeChange('length')}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 1000, label: '1k' },
                        { value: 5000, label: '5k' },
                        { value: 10000, label: '10k' },
                        { value: 20000, label: '20k' },
                        { value: 25000, label: '25k' },
                      ]}
                      sx={{
                        '& .MuiSlider-mark': {
                          height: 10,
                          width: 2,
                          backgroundColor: '#bfbfbf',
                        },
                        '& .MuiSlider-markActive': {
                          backgroundColor: '#fff',
                        },
                        '& .MuiSlider-mark[data-index="0"], .MuiSlider-mark[data-index="1"], .MuiSlider-mark[data-index="2"], .MuiSlider-mark[data-index="3"], .MuiSlider-mark[data-index="4"]': {
                          height: 16,
                          width: 4,
                          backgroundColor: '#2196f3',
                        },
                      }}
                    />
                  </Box>
                  <Typography>Total Area: {formatArea(state.area)} million blocks</Typography>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography>
                      Delivery Time: {state.size.deliveryDays} days 
                      (Recommended: {state.recommendedDays} days)
                    </Typography>
                    <Slider
                      value={state.size.deliveryDays}
                      min={1}
                      max={120}
                      step={1}
                      onChange={handleSizeChange('deliveryDays')}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 1, label: '1d' },
                        { value: 30, label: '30d' },
                        { value: 60, label: '60d' },
                        { value: 120, label: '120d' },
                      ]}
                    />
                    {state.size.deliveryDays < state.recommendedDays && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Faster delivery will increase the price by ${PRICE_PER_DAY_ADJUSTMENT * (state.recommendedDays - state.size.deliveryDays)} 
                        (${PRICE_PER_DAY_ADJUSTMENT} per day below recommended)
                      </Alert>
                    )}
                    {state.size.deliveryDays > state.recommendedDays && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Extended delivery time reduces the price by ${PRICE_PER_DAY_ADJUSTMENT * (state.size.deliveryDays - state.recommendedDays)}
                        (${PRICE_PER_DAY_ADJUSTMENT} per extra day)
                      </Alert>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 4, backgroundColor: '#fff' }}>
            <Typography variant="h6" gutterBottom>
              Additional Features
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price per unit</TableCell>
                    <TableCell align="right">Days per unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Regular features */}
                  {Object.entries(state.features).map(([key, feature]) => {
                    if (key !== 'structures' && key !== 'customFeature') {
                      return renderFeatureRow(
                        key,
                        feature as Feature,
                        (field) => handleFeatureChange(key, false, field)
                      );
                    }
                    return null;
                  })}

                  {/* Structure features */}
                  {Object.entries(state.features.structures).map(([key, feature]) => 
                    renderFeatureRow(
                      key,
                      feature,
                      (field) => handleFeatureChange(key, true, field)
                    )
                  )}

                  {/* Custom feature */}
                  {renderFeatureRow(
                    'customFeature',
                    state.features.customFeature,
                    (field) => handleFeatureChange('customFeature', false, field),
                    true
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              backgroundColor: '#1976d2',
              color: 'white',
              height: '100%'
            }}
          >
            <Typography variant="h4" gutterBottom align="center">
              Total Price
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2
            }}>
              <Typography variant="h5">
                ${state.totalPrice}
              </Typography>
              <Typography variant="h5">
                {state.totalDays} days
              </Typography>
            </Box>

            {state.totalDays !== state.recommendedDays && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2,
                px: 1
              }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: state.totalDays > state.recommendedDays ? '#ff4444' : '#4caf50',
                    whiteSpace: 'nowrap',
                    fontSize: '1.1rem'
                  }}
                >
                  {Math.abs(state.totalDays - state.recommendedDays)} days {state.totalDays > state.recommendedDays ? 'slower' : 'faster'}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: state.totalDays > state.recommendedDays ? '#4caf50' : '#ff4444',
                    whiteSpace: 'nowrap',
                    fontSize: '1.1rem'
                  }}
                >
                  {state.totalDays > state.recommendedDays ? 'Savings' : 'Additional cost'}: ${Math.abs((state.totalDays - state.recommendedDays) * PRICE_PER_DAY_ADJUSTMENT)}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />

            <Typography variant="subtitle2" gutterBottom>
              Base map ({formatArea(state.area)}M blocks): ${state.basePrice}
            </Typography>

            {getEnabledFeatures().length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Additional Features:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {getEnabledFeatures().map((feature, index) => (
                    <Typography 
                      key={index}
                      variant="body2" 
                      sx={{ 
                        mb: 0.5,
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.9)'
                      }}
                    >
                      {feature.name}: ${feature.price} ({feature.days}d)
                    </Typography>
                  ))}
                </Box>
              </>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                fullWidth
                onClick={handleClear}
                sx={{ 
                  backgroundColor: '#ff4444',
                  '&:hover': {
                    backgroundColor: '#cc0000'
                  }
                }}
              >
                Clear
              </Button>
              <Button 
                variant="contained" 
                fullWidth
                onClick={handleConfirmOrder}
                sx={{ 
                  backgroundColor: '#4caf50',
                  '&:hover': {
                    backgroundColor: '#388e3c'
                  }
                }}
              >
                Confirm Order
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}; 