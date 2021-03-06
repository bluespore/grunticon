/*
 * grunticon
 * https://github.com/filamentgroup/grunticon
 *
 * Copyright (c) 2012 Scott Jehl, Filament Group, Inc
 * Licensed under the MIT license.
 */

/*global __dirname:true*/
/*global require:true*/

module.exports = function( grunt , undefined ) {

    "use strict";

    var path = require( 'path' );
    var os = require( 'os' );

    var fs = require( 'fs-extra' );
    var uglify = require( 'uglify-js' );
    var RSVP = require( 'rsvp' );

    var DirectoryColorfy = require( 'directory-colorfy' );
    var DirectoryEncoder = require( 'directory-encoder' );
    var svgToPng = require( 'svg-to-png' );

    var helper = require( path.join( '..', 'lib', 'grunticon-helper' ) );

    grunt.registerMultiTask( 'e7grunticon', 'A mystical CSS icon solution.', function() {
        var done = this.async();

        // get the config
        var config = this.options({
            outputfile: "icons.scss",
            files: {
                loader: path.join( __dirname, 'grunticon', 'static', 'grunticon.loader.js'),
                banner: path.join( __dirname, 'grunticon', 'static', 'grunticon.loader.banner.js')
            },
            previewhtml: "preview.html",
            loadersnippet: "grunticon.loader.js",
            cssbasepath: path.sep,
            customselectors: {},
            cssprefix: ".i--",
            defaultWidth: "400px",
            defaultHeight: "300px",
            colors: {},
            pngfolder: "png",
            pngpath: "",
            template: "",
            tmpDir: "grunticon-tmp",
            previewTemplate: path.join( __dirname, "..", "example", "preview.hbs" )
        });

        // just a quick starting message
        grunt.log.writeln( "Look, it's a grunticon!" );

        var files = this.files.filter( function( file ){
            return file.src[0].match( /png|svg/ );
        });
        if( files.length === 0 ){
            grunt.log.writeln( "Grunticon has no files to read!" );
            done();
            return;
        }

        files = files.map( function( file ){
            return file.src[0];
        });

        config.src = this.files[0].orig.cwd;
        config.dest = this.files[0].orig.dest;
        config.pngUrl = this.files[0].orig.pngUrl;

        if( !config.dest || config.dest && config.dest === "" ){
            grunt.fatal("The destination must be a directory");
        }

        // folder name (within the output folder) for generated png files
        var pngfolder = path.join.apply( null, config.pngfolder.split( path.sep ) );

        // create the output directory
        grunt.file.mkdir( config.dest );

        // minify the source of the grunticon loader and write that to the output
        grunt.log.writeln( "grunticon now minifying the stylesheet loader source." );
        var banner = grunt.file.read( config.files.banner );
        config.min = banner + "\n" + uglify.minify( config.files.loader ).code;
        grunt.file.write( path.join( config.dest, config.loadersnippet ), config.min );
        grunt.log.writeln( "grunticon loader file created." );

        var svgToPngOpts = {
            pngfolder: pngfolder,
            defaultWidth: config.defaultWidth,
            defaultHeight: config.defaultHeight
        };

        // o2
        var optionsPng = {
            pngfolder: pngfolder,
            pngpath: config.pngpath,
            customselectors: config.customselectors,
            template: path.resolve( config.template ),
            previewTemplate: path.resolve( config.previewTemplate ),
            noencodepng: true,
            prefix: config.cssprefix
        };

        // o
        var optionsPngEncoded = {
            pngfolder: pngfolder,
            customselectors: config.customselectors,
            template: path.resolve( config.template ),
            previewTemplate: path.resolve( config.previewTemplate ),
            noencodepng: false,
            prefix: config.cssprefix
        };

        grunt.log.writeln("Coloring SVG files");
        // create the tmp directory
        var tmp = path.join( os.tmpDir(), config.tmpDir );
        if( grunt.file.exists( tmp ) ){
            fs.removeSync( tmp );
        }
        grunt.file.mkdir( tmp );
        var colorFiles;
        try{
            var dc = new DirectoryColorfy( config.src, tmp, {
                colors: config.colors
            });
            colorFiles = dc.convert();
        } catch( e ){
            grunt.fatal(e);
            done( false );
        }

        //copy non color config files into temp directory
        var transferFiles = this.files.filter( function( f ){
            return !f.src[0].match( /\.colors/ );
        });

        transferFiles.forEach( function( f ){
            var filenameArr = f.src[0].split( "/" ),
                filename = filenameArr[filenameArr.length - 1];
            grunt.file.copy( f.src[0], path.join( tmp, filename ) );
        });

        grunt.log.writeln("Converting SVG to PNG");
        svgToPng.convert( tmp, config.dest, svgToPngOpts )
        .then( function( result , err ){
            if( err ){
                grunt.fatal( err );
            }

            var encoder = new DirectoryEncoder(
                path.join( config.dest, pngfolder ),
                path.join( config.dest, config.outputfile ),
                optionsPng,
                optionsPngEncoded,
                tmp,
                config.pngUrl
            );

            grunt.log.writeln("Writing CSS");
            try {
                encoder.encode();
            } catch( e ){
                grunt.fatal( e );
                done( false );
            }

            grunt.log.writeln( "Grunticon now creating Preview File" );
            try {
                helper.createPreview( tmp, config );
            } catch(er) {
                grunt.fatal(er);
            }

            grunt.log.writeln( "Delete Temp Files" );
            fs.removeSync( tmp );
            done();
        });

    });
};
