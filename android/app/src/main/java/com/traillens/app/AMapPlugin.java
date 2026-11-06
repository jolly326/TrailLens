package com.traillens.app;

import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.widget.FrameLayout;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import com.amap.api.maps.AMap;
import com.amap.api.maps.CameraUpdateFactory;
import com.amap.api.maps.MapView;
import com.amap.api.maps.UiSettings;
import com.amap.api.maps.model.BitmapDescriptorFactory;
import com.amap.api.maps.model.LatLng;
import com.amap.api.maps.model.LatLngBounds;
import com.amap.api.maps.model.Marker;
import com.amap.api.maps.model.MarkerOptions;
import com.amap.api.maps.model.Polyline;
import com.amap.api.maps.model.PolylineOptions;
import com.amap.api.location.AMapLocation;
import com.amap.api.location.AMapLocationClient;
import com.amap.api.location.AMapLocationClientOption;
import com.amap.api.location.AMapLocationListener;
import com.amap.api.services.core.LatLonPoint;
import com.amap.api.services.route.BusRouteResult;
import com.amap.api.services.route.DrivePath;
import com.amap.api.services.route.DriveRouteResult;
import com.amap.api.services.route.DriveStep;
import com.amap.api.services.route.RideRouteResult;
import com.amap.api.services.route.RouteSearch;
import com.amap.api.services.route.WalkPath;
import com.amap.api.services.route.WalkRouteResult;
import com.amap.api.services.route.WalkStep;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
        name = "AMapPlugin",
        permissions = {
                @Permission(
                        strings = { "android.permission.ACCESS_FINE_LOCATION" },
                        alias = "location"
                ),
                @Permission(
                        strings = { "android.permission.ACCESS_COARSE_LOCATION" },
                        alias = "coarseLocation"
                )
        }
)
public class AMapPlugin extends Plugin implements AMapLocationListener {

    private static final String TAG = "AMapPlugin";

    private MapView mapView;
    private AMap aMap;
    private FrameLayout mapContainer;

    // Overlays
    private Polyline userPathPolyline;
    private Polyline plannedPathPolyline;
    private final List<Polyline> segmentPolylines = new ArrayList<>();
    private Marker startMarker;
    private Marker endMarker;
    private Marker currentLocationMarker;
    private Marker pathStartMarker;
    private Marker pathEndMarker;
    private Marker navMarker;
    private final List<Marker> customMarkers = new ArrayList<>();
    private final List<Marker> routeMarkers = new ArrayList<>();
    private Polyline routePolyline;

    // Navigation
    private Handler navHandler = new Handler(Looper.getMainLooper());
    private List<LatLng> navPoints = new ArrayList<>();
    private double navTotalDistance = 0;
    private long navStartTime = 0;
    private double navSpeed = 1.4; // m/s walking
    private double playbackSpeed = 1.0;
    private boolean isNavigating = false;
    private String navMode = "walking";

    // Location
    private AMapLocationClient locationClient;
    private PluginCall savedCall;

    // Map loaded flag
    private boolean mapReady = false;

    @Override
    public void load() {
        super.load();
        try {
            AMapLocationClient.updatePrivacyShow(getContext(), true, true);
            AMapLocationClient.updatePrivacyAgree(getContext(), true);
        } catch (Exception e) {
            Log.e(TAG, "Privacy init error", e);
        }
    }

    @PluginMethod
    public void createMap(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (mapView != null) {
                    JSObject ret = new JSObject();
                    ret.put("created", true);
                    call.resolve(ret);
                    return;
                }

                mapContainer = new FrameLayout(getContext());
                mapContainer.setLayoutParams(new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                ));

                mapView = new MapView(getContext());
                mapView.setLayoutParams(new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                ));
                mapContainer.addView(mapView);

                mapView.onCreate(null);
                aMap = mapView.getMap();

                UiSettings uiSettings = aMap.getUiSettings();
                uiSettings.setZoomControlsEnabled(false);
                uiSettings.setMyLocationButtonEnabled(false);

                LatLng defaultPos = new LatLng(39.90923, 116.397428);
                aMap.moveCamera(CameraUpdateFactory.newLatLngZoom(defaultPos, 13));

                mapReady = true;

                JSObject ret = new JSObject();
                ret.put("created", true);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "createMap error", e);
                call.reject("Failed to create map: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void showMap(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (mapContainer == null) {
                    call.reject("Map not created yet");
                    return;
                }

                FrameLayout rootView = (FrameLayout) getActivity().getWindow().getDecorView().findViewById(android.R.id.content);

                if (mapContainer.getParent() != null) {
                    ((FrameLayout) mapContainer.getParent()).removeView(mapContainer);
                }

                rootView.addView(mapContainer, 0);

                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);
                }

                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "showMap error", e);
                call.reject("Failed to show map: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void hideMap(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (mapContainer != null && mapContainer.getParent() != null) {
                    ((FrameLayout) mapContainer.getParent()).removeView(mapContainer);
                }
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().setBackgroundColor(Color.WHITE);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to hide map: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void resizeMap(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (mapContainer == null) {
                    call.reject("Map not created");
                    return;
                }

                // 修改点 1: int无法转换为Double (0 -> 0.0)
                double x = call.getDouble("x", 0.0);
                double y = call.getDouble("y", 0.0);
                double width = call.getDouble("width", 0.0);
                double height = call.getDouble("height", 0.0);

                float density = getContext().getResources().getDisplayMetrics().density;
                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                        (int) (width * density),
                        (int) (height * density)
                );
                lp.setMargins(
                        (int) (x * density),
                        (int) (y * density),
                        0, 0
                );
                lp.gravity = Gravity.TOP | Gravity.START;
                mapContainer.setLayoutParams(lp);

                if (mapView != null) {
                    mapView.setLayoutParams(new FrameLayout.LayoutParams(
                            FrameLayout.LayoutParams.MATCH_PARENT,
                            FrameLayout.LayoutParams.MATCH_PARENT
                    ));
                }

                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to resize map: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void setCenter(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (aMap == null) { call.reject("Map not ready"); return; }
                double lat = call.getDouble("lat", 39.90923);
                double lng = call.getDouble("lng", 116.397428);
                // 修改点 1: 确保 Double 不为 null 并提取 float
                float zoom = call.getDouble("zoom", 13.0).floatValue();
                aMap.moveCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(lat, lng), zoom));
                call.resolve();
            } catch (Exception e) {
                call.reject("setCenter error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void drawUserPath(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (aMap == null) { call.reject("Map not ready"); return; }

                clearUserPath();

                JSArray pathArr = call.getArray("path");
                if (pathArr == null || pathArr.length() == 0) {
                    call.resolve();
                    return;
                }

                List<LatLng> points = new ArrayList<>();
                boolean hasSegments = false;
                String firstGrade = null;

                for (int i = 0; i < pathArr.length(); i++) {
                    // 修改点 2: JSONObject无法转换为JSObject
                    JSObject pt = JSObject.fromJSONObject(pathArr.getJSONObject(i));
                    double lat = pt.getDouble("lat");
                    double lng = pt.getDouble("lng");
                    points.add(new LatLng(lat, lng));
                    if (pt.has("segmentGrade") && !pt.isNull("segmentGrade")) {
                        hasSegments = true;
                        if (firstGrade == null) firstGrade = pt.getString("segmentGrade");
                    }
                }

                if (points.isEmpty()) { call.resolve(); return; }

                pathStartMarker = aMap.addMarker(new MarkerOptions()
                        .position(points.get(0))
                        .title("起点"));

                if (points.size() > 1) {
                    pathEndMarker = aMap.addMarker(new MarkerOptions()
                            .position(points.get(points.size() - 1))
                            .title("终点"));

                    if (hasSegments) {
                        List<LatLng> currentSegment = new ArrayList<>();
                        currentSegment.add(points.get(0));
                        String currentGrade = firstGrade != null ? firstGrade : "flat";

                        for (int i = 1; i < points.size(); i++) {
                            currentSegment.add(points.get(i));
                            JSObject pt = JSObject.fromJSONObject(pathArr.getJSONObject(i));
                            String grade = pt.has("segmentGrade") && !pt.isNull("segmentGrade")
                                    ? pt.getString("segmentGrade") : "flat";

                            if (!grade.equals(currentGrade) || i == points.size() - 1) {
                                int color = getColorForGrade(currentGrade);
                                Polyline polyline = aMap.addPolyline(new PolylineOptions()
                                        .addAll(currentSegment)
                                        .color(color)
                                        .width(12)
                                        .setUseTexture(false));
                                segmentPolylines.add(polyline);

                                currentSegment = new ArrayList<>();
                                currentSegment.add(points.get(i - 1));
                                currentSegment.add(points.get(i));
                                currentGrade = grade;
                            }
                        }
                    } else {
                        userPathPolyline = aMap.addPolyline(new PolylineOptions()
                                .addAll(points)
                                .color(Color.parseColor("#3366FF"))
                                .width(12)
                                .setUseTexture(false));
                    }
                }

                boolean autoFit = call.getBoolean("autoFit", true);
                if (autoFit && points.size() > 1) {
                    LatLngBounds.Builder builder = LatLngBounds.builder();
                    for (LatLng p : points) builder.include(p);
                    aMap.moveCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), 60));
                }

                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "drawUserPath error", e);
                call.reject("drawUserPath error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void drawPlannedPath(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (aMap == null) { call.reject("Map not ready"); return; }

                if (plannedPathPolyline != null) {
                    plannedPathPolyline.remove();
                    plannedPathPolyline = null;
                }

                JSArray pathArr = call.getArray("path");
                if (pathArr == null || pathArr.length() < 2) {
                    call.resolve();
                    return;
                }

                List<LatLng> points = new ArrayList<>();
                for (int i = 0; i < pathArr.length(); i++) {
                    // 修改点 2: JSONObject转换
                    JSObject pt = JSObject.fromJSONObject(pathArr.getJSONObject(i));
                    points.add(new LatLng(pt.getDouble("lat"), pt.getDouble("lng")));
                }

                plannedPathPolyline = aMap.addPolyline(new PolylineOptions()
                        .addAll(points)
                        .color(Color.parseColor("#FFA500"))
                        .width(6)
                        .setUseTexture(true));

                call.resolve();
            } catch (Exception e) {
                call.reject("drawPlannedPath error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void addMarkers(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (aMap == null) { call.reject("Map not ready"); return; }

                for (Marker m : customMarkers) m.remove();
                customMarkers.clear();

                JSArray markersArr = call.getArray("markers");
                if (markersArr == null) { call.resolve(); return; }

                for (int i = 0; i < markersArr.length(); i++) {
                    // 修改点 2: JSONObject转换
                    JSObject m = JSObject.fromJSONObject(markersArr.getJSONObject(i));
                    LatLng pos = new LatLng(m.getDouble("lat"), m.getDouble("lng"));
                    String id = m.getString("id");

                    Marker marker = aMap.addMarker(new MarkerOptions()
                            .position(pos)
                            .title(m.optString("title", ""))
                            .snippet(id)
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE)));

                    customMarkers.add(marker);
                }

                aMap.setOnMarkerClickListener(marker -> {
                    String markerId = marker.getSnippet();
                    if (markerId != null && !markerId.isEmpty()) {
                        JSObject ret = new JSObject();
                        ret.put("id", markerId);
                        notifyListeners("onMarkerClick", ret);
                    }
                    return true;
                });

                call.resolve();
            } catch (Exception e) {
                call.reject("addMarkers error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void setStartEndMarkers(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (aMap == null) { call.reject("Map not ready"); return; }

                if (startMarker != null) { startMarker.remove(); startMarker = null; }
                if (endMarker != null) { endMarker.remove(); endMarker = null; }

                JSObject start = call.getObject("startPoint");
                JSObject end = call.getObject("destination");

                if (start != null) {
                    startMarker = aMap.addMarker(new MarkerOptions()
                            .position(new LatLng(start.getDouble("lat"), start.getDouble("lng")))
                            .title("起点")
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)));
                }

                if (end != null) {
                    endMarker = aMap.addMarker(new MarkerOptions()
                            .position(new LatLng(end.getDouble("lat"), end.getDouble("lng")))
                            .title("终点")
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED)));
                }

                call.resolve();
            } catch (Exception e) {
                call.reject("setStartEndMarkers error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void getCurrentLocation(PluginCall call) {
        try {
            if (locationClient == null) {
                AMapLocationClient.updatePrivacyShow(getContext(), true, true);
                AMapLocationClient.updatePrivacyAgree(getContext(), true);
                locationClient = new AMapLocationClient(getContext());
                AMapLocationClientOption option = new AMapLocationClientOption();
                option.setLocationMode(AMapLocationClientOption.AMapLocationMode.Hight_Accuracy);
                option.setOnceLocation(true);
                // 修改点 3: 修正位置。setOnceLocationLatest 是 Option 的方法，不是 Client 的
                option.setOnceLocationLatest(true);
                locationClient.setLocationOption(option);
                locationClient.setLocationListener(this);
            }

            savedCall = call;
            // 只需要 startLocation() 即可
            locationClient.startLocation();

        } catch (Exception e) {
            Log.e(TAG, "getCurrentLocation error", e);
            call.reject("Location error: " + e.getMessage());
        }
    }

    @Override
    public void onLocationChanged(AMapLocation location) {
        if (location != null && location.getErrorCode() == 0) {
            double lat = location.getLatitude();
            double lng = location.getLongitude();
            double altitude = location.getAltitude();

            getActivity().runOnUiThread(() -> {
                if (aMap != null) {
                    if (currentLocationMarker != null) currentLocationMarker.remove();
                    currentLocationMarker = aMap.addMarker(new MarkerOptions()
                            .position(new LatLng(lat, lng))
                            .title("当前位置")
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)));
                    aMap.moveCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(lat, lng), 16));
                }
            });

            JSObject ret = new JSObject();
            ret.put("lat", lat);
            ret.put("lng", lng);
            ret.put("altitude", altitude);
            notifyListeners("onLocationChange", ret);

            if (savedCall != null) {
                savedCall.resolve(ret);
                savedCall = null;
            }
        } else {
            if (savedCall != null) {
                String errMsg = location != null ? location.getErrorInfo() : "Unknown error";
                savedCall.reject("Location failed: " + errMsg);
                savedCall = null;
            }
        }

        if (locationClient != null) {
            locationClient.stopLocation();
        }
    }

    @PluginMethod
    public void calculateRoute(PluginCall call) {
        // ... (保持不变，省略中间过长代码，没有报错点) ...
        try {
            JSObject start = call.getObject("start");
            JSObject end = call.getObject("end");
            String mode = call.getString("mode", "walking");

            if (start == null || end == null) {
                call.reject("Start and end points required");
                return;
            }

            LatLonPoint startPoint = new LatLonPoint(start.getDouble("lat"), start.getDouble("lng"));
            LatLonPoint endPoint = new LatLonPoint(end.getDouble("lat"), end.getDouble("lng"));

            RouteSearch.FromAndTo fromAndTo = new RouteSearch.FromAndTo(startPoint, endPoint);

            RouteSearch routeSearch = new RouteSearch(getContext());
            routeSearch.setRouteSearchListener(new RouteSearch.OnRouteSearchListener() {
                @Override
                public void onBusRouteSearched(BusRouteResult busRouteResult, int i) {}

                @Override
                public void onDriveRouteSearched(DriveRouteResult driveRouteResult, int errorCode) {
                    if (errorCode == 1000 && driveRouteResult != null && driveRouteResult.getPaths() != null && driveRouteResult.getPaths().size() > 0) {
                        DrivePath drivePath = driveRouteResult.getPaths().get(0);
                        float distance = drivePath.getDistance();
                        long duration = drivePath.getDuration();

                        List<LatLng> routePoints = new ArrayList<>();
                        for (DriveStep step : drivePath.getSteps()) {
                            if (step.getPolyline() != null) {
                                for (LatLonPoint p : step.getPolyline()) {
                                    routePoints.add(new LatLng(p.getLatitude(), p.getLongitude()));
                                }
                            }
                        }

                        getActivity().runOnUiThread(() -> {
                            drawRouteOnMap(routePoints);
                        });

                        List<JSObject> navPointsList = new ArrayList<>();
                        for (LatLng p : routePoints) {
                            JSObject pt = new JSObject();
                            pt.put("lat", p.latitude);
                            pt.put("lng", p.longitude);
                            navPointsList.add(pt);
                        }

                        JSObject result = new JSObject();
                        result.put("distance", distance);
                        result.put("duration", duration);
                        result.put("navPoints", new JSArray(navPointsList));

                        call.resolve(result);
                    } else {
                        call.reject("Drive route search failed: " + errorCode);
                    }
                }

                @Override
                public void onWalkRouteSearched(WalkRouteResult walkRouteResult, int errorCode) {
                    if (errorCode == 1000 && walkRouteResult != null && walkRouteResult.getPaths() != null && walkRouteResult.getPaths().size() > 0) {
                        WalkPath walkPath = walkRouteResult.getPaths().get(0);
                        float distance = walkPath.getDistance();
                        long duration = walkPath.getDuration();

                        List<LatLng> routePoints = new ArrayList<>();
                        for (WalkStep step : walkPath.getSteps()) {
                            if (step.getPolyline() != null) {
                                for (LatLonPoint p : step.getPolyline()) {
                                    routePoints.add(new LatLng(p.getLatitude(), p.getLongitude()));
                                }
                            }
                        }

                        getActivity().runOnUiThread(() -> {
                            drawRouteOnMap(routePoints);
                        });

                        List<JSObject> navPointsList = new ArrayList<>();
                        for (LatLng p : routePoints) {
                            JSObject pt = new JSObject();
                            pt.put("lat", p.latitude);
                            pt.put("lng", p.longitude);
                            navPointsList.add(pt);
                        }

                        JSObject result = new JSObject();
                        result.put("distance", distance);
                        result.put("duration", duration);
                        result.put("navPoints", new JSArray(navPointsList));

                        call.resolve(result);
                    } else {
                        call.reject("Walk route search failed: " + errorCode);
                    }
                }

                @Override
                public void onRideRouteSearched(RideRouteResult rideRouteResult, int i) {}
            });

            if ("driving".equals(mode)) {
                RouteSearch.DriveRouteQuery query = new RouteSearch.DriveRouteQuery(
                        fromAndTo, RouteSearch.DrivingDefault, null, null, "");
                routeSearch.calculateDriveRouteAsyn(query);
            } else {
                RouteSearch.WalkRouteQuery query = new RouteSearch.WalkRouteQuery(fromAndTo);
                routeSearch.calculateWalkRouteAsyn(query);
            }

        } catch (Exception e) {
            Log.e(TAG, "calculateRoute error", e);
            call.reject("Route calculation error: " + e.getMessage());
        }
    }

    private void drawRouteOnMap(List<LatLng> routePoints) {
        if (aMap == null || routePoints.isEmpty()) return;
        clearRoute();
        routePolyline = aMap.addPolyline(new PolylineOptions()
                .addAll(routePoints)
                .color(Color.parseColor("#4CAF50"))
                .width(10));
    }

    @PluginMethod
    public void startNavigation(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (aMap == null) { call.reject("Map not ready"); return; }

                JSArray pointsArr = call.getArray("navPoints");
                // 修改点 1: 0 -> 0.0
                double totalDist = call.getDouble("totalDistance", 0.0);
                String mode = call.getString("mode", "walking");
                double speed = call.getDouble("speed", mode.equals("driving") ? 10.0 : 1.4);
                playbackSpeed = call.getDouble("playbackSpeed", 1.0);

                navPoints.clear();
                for (int i = 0; i < pointsArr.length(); i++) {
                    // 修改点 2: JSONObject转换
                    JSObject pt = JSObject.fromJSONObject(pointsArr.getJSONObject(i));
                    navPoints.add(new LatLng(pt.getDouble("lat"), pt.getDouble("lng")));
                }

                navTotalDistance = totalDist;
                navSpeed = speed;
                navMode = mode;
                navStartTime = System.currentTimeMillis();
                isNavigating = true;

                if (!navPoints.isEmpty()) {
                    if (navMarker != null) navMarker.remove();
                    float markerColor = "driving".equals(mode)
                            ? BitmapDescriptorFactory.HUE_BLUE
                            : BitmapDescriptorFactory.HUE_GREEN;
                    navMarker = aMap.addMarker(new MarkerOptions()
                            .position(navPoints.get(0))
                            .title("导航")
                            .icon(BitmapDescriptorFactory.defaultMarker(markerColor)));

                    updateNavigation();
                }

                call.resolve();
            } catch (Exception e) {
                call.reject("startNavigation error: " + e.getMessage());
            }
        });
    }

    private void updateNavigation() {
        if (!isNavigating || navPoints.isEmpty() || navMarker == null) return;

        long elapsed = (System.currentTimeMillis() - navStartTime) / 1000;
        double traveled = navSpeed * elapsed * playbackSpeed;

        if (traveled >= navTotalDistance) {
            stopNavigationInternal();
            JSObject ret = new JSObject();
            ret.put("finished", true);
            notifyListeners("onNavigationFinished", ret);
            return;
        }

        double sum = 0;
        LatLng target = navPoints.get(0);
        for (int i = 0; i < navPoints.size() - 1; i++) {
            LatLng p1 = navPoints.get(i);
            LatLng p2 = navPoints.get(i + 1);
            double d = distanceBetween(p1, p2);
            if (traveled <= sum + d) {
                double t = d > 0 ? (traveled - sum) / d : 0;
                double lat = p1.latitude + (p2.latitude - p1.latitude) * t;
                double lng = p1.longitude + (p2.longitude - p1.longitude) * t;
                target = new LatLng(lat, lng);
                break;
            }
            sum += d;
            if (i == navPoints.size() - 2) target = p2;
        }

        LatLng finalTarget = target;
        getActivity().runOnUiThread(() -> {
            if (navMarker != null) {
                navMarker.setPosition(finalTarget);
                aMap.moveCamera(CameraUpdateFactory.newLatLng(finalTarget));
            }
        });

        JSObject ret = new JSObject();
        ret.put("lat", target.latitude);
        ret.put("lng", target.longitude);
        notifyListeners("onNavigationPosition", ret);

        navHandler.postDelayed(this::updateNavigation, 16);
    }

    @PluginMethod
    public void stopNavigation(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopNavigationInternal();
            call.resolve();
        });
    }

    private void stopNavigationInternal() {
        isNavigating = false;
        navHandler.removeCallbacksAndMessages(null);
        if (navMarker != null) {
            navMarker.remove();
            navMarker = null;
        }
        navPoints.clear();
        navTotalDistance = 0;
        navStartTime = 0;
    }

    @PluginMethod
    public void clearRoute(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            clearRoute();
            call.resolve();
        });
    }

    @PluginMethod
    public void fitBounds(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (aMap == null) { call.reject("Map not ready"); return; }

                JSArray pathArr = call.getArray("path");
                if (pathArr == null || pathArr.length() == 0) { call.resolve(); return; }

                LatLngBounds.Builder builder = LatLngBounds.builder();
                for (int i = 0; i < pathArr.length(); i++) {
                    // 修改点 2: JSONObject转换
                    JSObject pt = JSObject.fromJSONObject(pathArr.getJSONObject(i));
                    builder.include(new LatLng(pt.getDouble("lat"), pt.getDouble("lng")));
                }

                int padding = call.getInt("padding", 60);
                aMap.moveCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), padding));
                call.resolve();
            } catch (Exception e) {
                call.reject("fitBounds error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void destroyMap(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                stopNavigationInternal();
                clearUserPath();
                clearRoute();
                clearMarkers();

                if (currentLocationMarker != null) { currentLocationMarker.remove(); currentLocationMarker = null; }

                if (mapContainer != null && mapContainer.getParent() != null) {
                    ((FrameLayout) mapContainer.getParent()).removeView(mapContainer);
                }

                if (mapView != null) {
                    mapView.onDestroy();
                    mapView = null;
                }
                aMap = null;
                mapReady = false;

                if (locationClient != null) {
                    locationClient.stopLocation();
                    locationClient.onDestroy();
                    locationClient = null;
                }

                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().setBackgroundColor(Color.WHITE);
                }

                call.resolve();
            } catch (Exception e) {
                call.reject("destroyMap error: " + e.getMessage());
            }
        });
    }

    private void clearUserPath() {
        if (userPathPolyline != null) { userPathPolyline.remove(); userPathPolyline = null; }
        if (plannedPathPolyline != null) { plannedPathPolyline.remove(); plannedPathPolyline = null; }
        for (Polyline p : segmentPolylines) p.remove();
        segmentPolylines.clear();
        if (pathStartMarker != null) { pathStartMarker.remove(); pathStartMarker = null; }
        if (pathEndMarker != null) { pathEndMarker.remove(); pathEndMarker = null; }
    }

    private void clearRoute() {
        if (routePolyline != null) { routePolyline.remove(); routePolyline = null; }
        for (Marker m : routeMarkers) m.remove();
        routeMarkers.clear();
    }

    private void clearMarkers() {
        for (Marker m : customMarkers) m.remove();
        customMarkers.clear();
        if (startMarker != null) { startMarker.remove(); startMarker = null; }
        if (endMarker != null) { endMarker.remove(); endMarker = null; }
    }

    private int getColorForGrade(String grade) {
        switch (grade) {
            case "uphill": return Color.parseColor("#ef4444");
            case "downhill": return Color.parseColor("#22c55e");
            default: return Color.parseColor("#3366FF");
        }
    }

    private double distanceBetween(LatLng a, LatLng b) {
        final double R = 6371e3;
        double lat1 = Math.toRadians(a.latitude);
        double lat2 = Math.toRadians(b.latitude);
        double dLat = Math.toRadians(b.latitude - a.latitude);
        double dLng = Math.toRadians(b.longitude - a.longitude);
        double aa = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        return R * c;
    }

    // =================== 修改点 4: 生命周期处理 ===================
    // Capacitor v3/v4/v5 的 Plugin 没有暴露原生的 onResume/onPause/onDestroy。
    // 需要使用 handleOnResume / handleOnPause / handleOnDestroy
    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (mapView != null) mapView.onResume();
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (mapView != null) mapView.onPause();
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        stopNavigationInternal();
        if (mapView != null) mapView.onDestroy();
        if (locationClient != null) {
            locationClient.stopLocation();
            locationClient.onDestroy();
        }
    }
}