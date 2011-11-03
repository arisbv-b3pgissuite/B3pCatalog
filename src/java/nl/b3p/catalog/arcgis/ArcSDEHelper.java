package nl.b3p.catalog.arcgis;

import com.esri.arcgis.datasourcesGDB.SdeWorkspaceFactory;
import com.esri.arcgis.geodatabase.IDataset;
import com.esri.arcgis.geodatabase.IEnumDataset;
import com.esri.arcgis.geodatabase.IMetadata;
import com.esri.arcgis.geodatabase.Workspace;
import com.esri.arcgis.geodatabase.XmlPropertySet;
import com.esri.arcgis.geodatabase.esriDatasetType;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import nl.b3p.catalog.config.Root;
import nl.b3p.catalog.config.SDERoot;
import nl.b3p.catalog.filetree.Dir;
import nl.b3p.catalog.filetree.DirContent;
import nl.b3p.catalog.filetree.DirEntry;

public class ArcSDEHelper {
    
    public static DirContent getDirContent(SDERoot root, String prefix, String path) throws IOException {

        DirContent dc = new DirContent();
        if("".equals(path)) { 
            dc.setDirs(getFeatureDatasets(root, prefix));
            dc.setFiles(getFeatureClasses(root, prefix));
        } else {
            dc.setFiles(getFeatureClassesInDataset(root, prefix + path + DirContent.SEPARATOR, path));
        }
        return dc;
    }
    
    public static IDataset getDataset(Root r, String path) throws IOException {
        SDERoot root = (SDERoot)r;
        String paths[] = path.split(Pattern.quote(DirContent.SEPARATOR + ""));
        
        String containingFeatureDatasetName = null;
        String datasetName = null;
        
        if(paths.length == 1) {
            datasetName = paths[0];
        } else {
            containingFeatureDatasetName = paths[0];
            datasetName = paths[1];
        }
            
        if(datasetName == null) {
            throw new IllegalArgumentException("Invalid dataset specified");
        }
        Workspace ws = getWorkspace(root);
        IEnumDataset enumDataset = ws.getSubsets();
        if(containingFeatureDatasetName != null) {
            IDataset ds;
            while ((ds = enumDataset.next()) != null) {
                if (ds.getType() == esriDatasetType.esriDTFeatureDataset && ds.getName().equals(containingFeatureDatasetName)) {
                    enumDataset = ds.getSubsets();
                    break;
                }
            }
            if(ds == null) {
                throw new IllegalArgumentException("Feature dataset \"" + containingFeatureDatasetName + "\" not found");
            }
        }
        IDataset ds;
        while ((ds = enumDataset.next()) != null) {
            if (ds.getType() != esriDatasetType.esriDTFeatureDataset && ds.getName().equals(datasetName)) {
                return ds;
            }
        }      
        throw new IllegalArgumentException("Feature class \"" + datasetName + "\" not found");        
    }  
    
    private static Workspace getWorkspace(SDERoot root) throws IOException {
        SdeWorkspaceFactory factory = new SdeWorkspaceFactory();
        return new Workspace(factory.openFromString(root.getArcobjectsConnection(), 0));
    }    

    public static List<Dir> getFeatureDatasets(SDERoot root, String currentPath) throws IOException {
        Workspace ws = getWorkspace(root);

        try {
            List<Dir> dirs = new ArrayList<Dir>();

            IEnumDataset enumDataset = ws.getSubsets();
            IDataset ds;
            while ((ds = enumDataset.next()) != null) {
                if (ds.getType() == esriDatasetType.esriDTFeatureDataset) {
                    Dir d = new Dir(ds.getName(), currentPath + ds.getName());
                    dirs.add(d);
                }
            }
            return dirs;
        } finally {
            ws.release();
        }
    }

    public static List<nl.b3p.catalog.filetree.DirEntry> getFeatureClasses(SDERoot root, String currentPath) throws IOException {
        Workspace ws = getWorkspace(root);

        try {
            return getDatasetEnumFeatureClassFiles(ws.getSubsets(), currentPath);
        } finally {
            ws.release();
        }
    }

    public static List<nl.b3p.catalog.filetree.DirEntry> getFeatureClassesInDataset(SDERoot root, String currentPath, String dataset) throws IOException {
        if(dataset == null) {
            throw new IllegalArgumentException("Invalid feature dataset specified");
        }

        Workspace ws = getWorkspace(root);

        try {
            IEnumDataset enumDataset = ws.getSubsets();

            IDataset ds;
            while ((ds = enumDataset.next()) != null) {
                if (ds.getType() == esriDatasetType.esriDTFeatureDataset && ds.getName().equals(dataset)) {
                    break;
                }
            }
            if(ds == null) {
                throw new IllegalArgumentException("Dataset \"" + dataset + "\" not found");
            }

            return getDatasetEnumFeatureClassFiles(ds.getSubsets(), currentPath);
        } finally {
            ws.release();
        }
    }

    private static List<nl.b3p.catalog.filetree.DirEntry> getDatasetEnumFeatureClassFiles(IEnumDataset enumDataset, String currentPath) throws IOException {
        List<nl.b3p.catalog.filetree.DirEntry> files = new ArrayList<nl.b3p.catalog.filetree.DirEntry>();
        IDataset ds;
        while ((ds = enumDataset.next()) != null) {
            if(ds.getType() !=  esriDatasetType.esriDTFeatureDataset) {
                DirEntry f = new nl.b3p.catalog.filetree.DirEntry(ds.getName(), currentPath + ds.getName());
                f.setIsGeo(true);
                files.add(f);
            }
        }

        return files;
    }

    public static String getMetadata(IDataset dataset) throws IOException {
        IMetadata imd = (IMetadata)dataset.getFullName();
        return ((XmlPropertySet)imd.getMetadata()).getXml("/");
    }

    public static void saveMetadata(IDataset dataset, String metadata) throws IOException {
        IMetadata imd = (IMetadata)dataset.getFullName();
        XmlPropertySet mdPS = (XmlPropertySet)imd.getMetadata();
        mdPS.setXml(metadata);
        imd.setMetadata(mdPS);
    }
}
